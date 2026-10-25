import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support large image payloads (screenshots can be high resolution)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini Vision / OCR API route for converting Facebook screenshots to Real Estate Cards
app.post('/api/convert-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'لم يتم إرسال بيانات الصورة (imageBase64).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في خادم التطبيق.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');

    const prompt = `
أنت خبير ذكاء اصطناعي متخصص في سوق العقارات في محافظة أسيوط بجمهورية مصر العربية.
المهمة: تحليل صورة السكرين شوت المرفقة لمنشور/بوست عقاري من فيسبوك واستخراج كافة البيانات بدقة متناهية لتحويله إلى بطاقة عقارية جاهزة للنشر في منصة "سكن أسيوط".

قواعد الاستخراج وتصنيف البيانات:
1. نوع المنشور (postType):
   - "offer": إذا كان صاحب المنشور يعرض عقاراً للبيع أو للإيجار (مالك، سمسار، وسيط عقاري).
   - "request": إذا كان يبحث عن عقار أو يطلب شقة / سكن / محل (مستأجر، مشتري، طالب سكن).
2. الغرض (purpose):
   - "rent" للإيجار
   - "sale" للبيع أو الشراء
3. اسم المصدر أو الجروب أو الصفحة (sourceName):
   - اسم الجروب أو الصفحة أو حساب الناشر على فيسبوك إذا كان ظاهراً في الصورة، أو "جروبات عقارات أسيوط" كافتراضي.
4. نوع العقار (propertyType):
   - حدد نوع العقار بدقة: "شقة", "شقة دوبلكس", "فيلا", "رووف", "محل تجاري", "مكتب إداري", "أرض", "عمارة كاملة", أو "استوديو".
5. المنطقة والحي في أسيوط (district):
   - طابق المنطقة المذكورة مع الأحياء المشهورة في أسيوط مثل: "الأربعين", "الهلالي", "المحطة", "شركة قلتة", "الجمهورية", "سيتي", "الزهراء", "الحمراء", "النميس", "يسري راغب", "الوليدية", "المعلمين", "نزلة عبد اللاه", "أسيوط الجديدة", "الهضبة", "منقباد", "ديروط", "القوصية", "منفلوط", "أبنوب", "صدفا", "الغنايم", "البداري", "أبو تيج"، أو "أخرى".
6. السعر (price):
   - السعر أو الإيجار الشهري بالأرقام الصحيحة فقط (بالجنيه المصري). إذا لم يذكر السعر، ضعه 0.
7. المساحة (area):
   - المساحة بالمتر المربع كرقم صحيح فقط. إذا لم تذكر المساحة، ضعها 0.
8. غرف النوم (bedrooms):
   - عدد الغرف كرقم صحيح (افتراضي 2 أو 3 إذا كان مناسباً).
9. الحمامات (bathrooms):
   - عدد الحمامات كرقم صحيح (افتراضي 1).
10. الدور / الطابق (floor):
    - رقم الدور أو وصفه (مثال: "الدور الثالث", "أرضي", "الرابع بأسانسير").
11. التشطيب (finishing):
    - نوع التشطيب: "سوبر لوكس", "ألترا سوبر لوكس", "لوكس", "نصف تشطيب", أو "على المحارة".
12. أرقام الهواتف ووسائل التواصل (phones):
    - استخرج جميع أرقام الهواتف المصرية المذكورة في البوست (سواء 010, 011, 012, 015 أو أرضي 088)، واجعل رقم الاتصال الأساسي في حقل contactPhone.
13. اسم المعلن / الناشر (contactName):
    - اسم الشخص أو المكتب المكتوب، أو اسم حساب فيسبوك.
14. العنوان التفصيلي (address):
    - الشارع أو العلامة المميزة المذكورة في النص (مثال: "شارع الهلالي بجوار بنك مصر").
15. النص الكامل للبوست الأصلي (rawText):
    - النص المكتوب داخل البوست بالحرف كما هو في الصورة.
16. عنوان جذاب ومختصر للبطاقة (title):
    - عنوان عقاري مختصر وواضح (مثال: "شقة 120م للبيع في شارع الجمهورية").
17. المرافق والمميزات (features):
    - قائمة بالمميزات كـ Array of strings (مثل: ["عداد كهرباء قديم", "غاز طبيعي", "أسانسير", "حصة في الأرض"]).
18. ملاحظات إضافية (notes):
    - أي تفاصيل إضافية مفيدة (مثل: "للعائلات فقط", "سداد شهرين تأمين").

يجب أن تكون الإجابة عبارة عن كائن JSON صالح فقط بدون أي علامات markdown:
{
  "postType": "offer",
  "purpose": "rent",
  "sourceName": "عقارات أسيوط",
  "title": "عنوان الإعلان",
  "propertyType": "شقة",
  "district": "الهلالي",
  "address": "شارع الهلالي الرئيسي",
  "price": 3500,
  "area": 120,
  "bedrooms": 3,
  "bathrooms": 1,
  "floor": "الدور الثالث",
  "finishing": "سوبر لوكس",
  "contactPhone": "01001234567",
  "allPhones": ["01001234567"],
  "contactName": "أحمد محمود",
  "rawText": "نص البوست كاملاً",
  "features": ["أسانسير", "غاز طبيعي"],
  "notes": "شقة نظيفة وجاهزة للسكن الفوري"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const outputText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      const cleanJson = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error processing screenshot with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'فشل في تحليل الصورة واستخراج البيانات.',
    });
  }
});

// Setup Vite dev middleware or serve static production build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
