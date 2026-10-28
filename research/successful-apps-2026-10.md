# تقرير مختصر: 3 تطبيقات ناجحة تتعلم منها

## الخلاصة
- **Cal AI** عنده أقوى رقم. انباع لـMyFitnessPal وهو يدخل **$30–40M+ بالسنة**، وتقنيته تقريباً نفس تقنية Fridgy AI.
- **Boothie** أوضح مثال لمطور واحد: حوالي **$51.7K بالشهر (إجمالي)** بعد ~4 شهور من الإطلاق، وتسويقه كله محتوى مجاني على TikTok.
- **Coconote** فكرة قوية للطلاب، وما لقينا منافس عربي واضح. ومؤسسيه يقولون إنه وصل **$6.7M ARR** وانباع لـQuizlet بأقل من سنتين. هذا تصريحهم ببودكاست RevenueCat، ومحد قاسه بشكل مستقل.

## جدول المقارنة

| التطبيق | شنو يحل | شكد يدخل (الرقم + التاريخ + الثقة) | شلون يتسوق | سرعة/سهولة البناء | فريق |
|---|---|---|---|---|---|
| Cal AI | تسجيل السعرات بصورة وحدة بدل الإدخال اليدوي | $30M+ بالسنة حسب TechCrunch، و+$40M مبيعات آخر 12 شهر حسب مصادر ثانية (2026-03-02، **مؤكد** من المشتري بس مو مدقق) | ~250 influencer مدفوعين + Apple Search Ads | ~2 شهر من أول سطر كود للإطلاق | 3 بالإطلاق، ~17 بالذروة، 7 وقت البيع |
| Boothie | سيلفي يصير صورة photobooth أو صورة احترافية بدون مصور | $51,674 MRR إجمالي (~2026-10-26، **مؤكد** عبر RevenueCat/TrustMRR) | كاروسيل "قبل/بعد" مجاني على TikTok | wrapper بسيط على image API (المدة ما معروفة) | 1–2 (مؤسس واحد رسمياً + شريك حسب GitHub مالته) |
| Coconote | المحاضرة تتحول لملاحظات وflashcards وquiz | $6.7M ARR (2026-03، **تصريح المؤسسين** نشرته RevenueCat) | ~25 طالب creator مدفوعين | نسخة MVP بـ2–4 أسابيع (تقدير) | 2 مؤسسين (Brett Bauman وZack Hargett) + ~25 creator |

## 1) Cal AI
- **الفكرة:** تصور الأكلة، والـAI يطلعلك السعرات والماكروز بثواني.
- **الأرباح:**
  - MyFitnessPal اشترته. الصفقة انغلقت 12/2025 وانعلنت 2026-03-02، وقالت لـTechCrunch إن إيراده أكثر من $30M بالسنة وعنده أكثر من 15M تحميل، كله بأقل من سنتين. ومواقع ثانية (TheNextWeb، Techleap) نقلت إن مبيعاته كانت أكثر من $40M بآخر 12 شهر. الرقم **مؤكد** من المشتري، بس ما معروف إذا إجمالي لو صافي.
  - Appfigures قدّرت ~$2M بشهر شباط 2025 بس، وهو شهر ذروة للدايت (**تقدير**).
  - المؤسس يقول "كسرنا $50M ARR" (**غير مؤكد**)، لا تعتمد عليه.
  - سعر الاستحواذ ما انعلن، وشكد يدخل هسه بعد البيع ما معروف.
- **ليش نجح:** يحل أكبر سبب يخلي الناس تترك عد السعرات (الإدخال اليدوي متعب). الديمو نفسه إعلان TikTok جاهز. سوق الدايت ضخم وما يخلص. وعنده hard paywall مع خطة سنوية وonboarding quiz طويل.
- **شلون انبنى:** فوق APIs جاهزة (OpenAI + Anthropic) مع RAG على قواعد بيانات أكل مفتوحة، بدون موديل خاص بيهم. أول كود كان 3/2024 والإطلاق 5/2024.
- **انتبه:** النمو كان مدفوع وغالي. ~250 influencer، وApple Search Ads على أكثر من 2.6K كلمة، ونص الفريق كان شغله تسويق. وكان عدهم شريك خبير (Blake Anderson) موّل أول 6 شهور. أول تجربة كانت $2K على influencer واحد، وجابت ~1,000 تحميل و~100 مشترك.
- **الدرس إلك:** نفس معمار Fridgy: كاميرا ← vision LLM ← JSON ← RevenueCat. الفرق اللي تكدر تسويه:
  - قاعدة بيانات **أكلات عراقية وخليجية** (تمن وقيمة، دولمة، كبسة، مسكوف) بأوزانها ودهنها الحقيقي.
  - **وضع رمضان** (فطور، سحور، ماي).
  - واجهة عربية RTL، وأسعار للخليج.

## 2) Boothie
- **الفكرة:** سيلفي عادي يصير صورة photobooth أو editorial بثواني.
- **الأرباح:**
  - حسب TrustMRR (مربوط بـRevenueCat) بتاريخ ~2026-10-26: $51,674 MRR، و$165,833 من أول ما انطلق، و2,173 اشتراك فعّال، ونمو +18% بالشهر. الأرقام **مؤكدة**، بس إجمالية، يعني الصافي تقريباً $40–44K بالشهر.
  - بتاريخ 2026-09-23 كان $38K MRR و1.4K اشتراك.
  - هامش الربح 55% **غير مؤكد**، المؤسس كاتبه بنفسه. ورقم "9,800 مشترك" **غير مؤكد** وغالباً تراكمي.
  - معروض للبيع بـ$1.5M، وهذا سعر طلب مو تقييم.
- **ليش نجح:** النتيجة تنفهم من سحبة وحدة، وجه على ترند وقته، وكلفة الصورة سنتات، والاشتراك أسبوعي (~$23.8 بالشهر لكل مشترك).
- **شلون انبنى:** رسمياً مؤسس واحد (Keremcan Şeker، شركة فردية بتركيا حسب شروط الاستخدام)، بس صفحته على GitHub تقول انبنى ويا شريك. نزل على iOS بحدود 6–7/2026 وعلى Android بـ9/2026. الـstack ما معروف، وغالباً wrapper على image API (مثلاً Gemini 2.5 Flash Image، تقريباً $0.039 للصورة).
- **انتبه:** يسوق من ~12 حساب بشخصيات وهمية بأمريكا وألمانيا وتركيا. هذا شغل يومي، وقانونياً منطقة رمادية (قواعد TikTok، قاعدة FTC ضد الشهادات المزيفة، قانون الاتحاد الأوروبي). وتطبيقات مشابهة أغلبها تدخل بين $80 و$7K بالشهر بس.
- **الدرس إلك:** تكدر تبني مثله بأسبوع لأسبوعين بالـstack مالتك. الزاوية العربية: ستايلات أعراس، عيد، تخرج، لبس تراثي. وانسخ فكرة كاروسيل "قبل/بعد" بحسابات باسم التطبيق وواضحة إنها إلك، وحتى للمعرض ("مطبخك ويا هالثلاجة").

## 3) Coconote
- **الفكرة:** تسجل المحاضرة (أو تحط فيديو أو YouTube أو PDF) وتطلعلك ملاحظات وflashcards وquiz.
- **الأرباح:**
  - المؤسسين (Brett Bauman وZack Hargett) قالوا ببودكاست Sub Club مال RevenueCat (2026-03-18) إنهم وصلوا **$6.7M ARR** بدون أي استثمار، وباعوا لـQuizlet بأقل من سنتين.
  - أول $100K ARR جاهم بـ45 يوم، وأول $1M بـ4 شهور.
  - هذا **تصريح مؤسسين** نشرته RevenueCat، وماكو تقدير مستقل. إذا الرقم إجمالي، فالصافي ~$4.7–5.7M بالسنة.
  - شروط البيع ما انعلنت.
- **ليش نجح:** مشكلة يومية تكبر قبل الامتحانات، والديمو يتصور بـ15 ثانية، وجمهور الطلاب كبير ويتجدد كل سنة.
- **شلون انبنى:** speech-to-text وبعده LLM يطلع JSON. إذا تبنيه إنت: Expo (expo-audio) + Firebase Functions + STT رخيص (Groq Whisper-turbo ~$0.04 للساعة، gpt-4o-mini-transcribe ~$0.18 للساعة) + RevenueCat. نسخة MVP بـ2–4 أسابيع، ونسخة عربية قوية تحتاج 2–3 شهور (تسجيل طويل بالخلفية، رفع الملف على شكل مقاطع، لهجات).
- **انتبه:** "بدون إعلانات" معناها بدون شبكات إعلانية بس، لأن الـ25 creator كانوا مدفوعين. والسوق مزدحم (Turbolearn, Knowt, StudyFetch)، وأكو بدائل مجانية (NotebookLM, Apple Notes).
- **الدرس إلك:**
  - الجمهور: طلاب الطب والصيدلة والهندسة بالعراق (المحاضرة إنكليزي والشرح عربي)، وطلاب السادس الإعدادي اللي يلصقون رابط محاضرة المدرس من YouTube أو Telegram.
  - التسويق: كروبات Telegram وWhatsApp للمراحل، وسفراء بالجامعات.

## توصيتي
الأنسب إلك **فكرة Cal AI بنسخة عربية** ("شكد سعرات هالكبسة؟"):
- أغلب الكود موجود عندك من Fridgy.
- المشكلة دايمة، والديمو نفسه إعلان، والخليج يدفع.
- سوّقه بطريقة Boothie (محتوى رخيص مجاني) مو بميزانية Cal AI.
- وتكدر تربطه ويا Fridgy: اللي بالثلاجة ← وجبة ← سعرات.

**أول 3 خطوات:**
1. **(يومين) تحقق قبل ما تبني:**
   - دوّر بـApp Store وGoogle Play (السعودية، الإمارات، العراق) على منافسين عرب.
   - جرّب 20–30 صورة أكل عراقي وخليجي على موديل الرؤية، وقارن النتيجة بأوزان حقيقية.
   - تأكد شلون تستلم فلوس Apple وGoogle من العراق. يمكن تحتاج حساب بنكي أو شركة بالإمارات.
2. **(1–3 أسابيع) ابني MVP من كود Fridgy:**
   - كاميرا ← JSON سعرات ← شاشة تعديل الكمية ← سجل يومي.
   - onboarding quiz بالعربي، وبعده hard paywall بـRevenueCat (خطة سنوية + trial 3 أيام) بأسعار خليجية.
   - الحق اطلقه قبل رمضان الجاي.
3. **(أسبوعين بعد الإطلاق) اختبار تسويق صغير:**
   - 2–3 حسابات faceless باسم التطبيق، تنزل يومياً فيديو "شكد سعرات هالأكلة؟".
   - جرب 3–5 creators عراقيين أو خليجيين بمبلغ صغير.
   - راقب cost per install وtrial-to-paid بـRevenueCat، وكبّر بس اللي يجيب مشتركين.

## تحفظات
- أغلب الأرقام **إجمالية** قبل عمولة Apple وGoogle (15–30%)، ومن تصريحات مؤسسين أو مشتري، وولا رقم منها مدقق محاسبياً. وأرقام Coconote تصريح مؤسسين بس.
- **Survivorship bias:** إحنا شفنا الناجحين بس. أغلب التطبيقات الشبيهة بـBoothie تدخل بين $80 و$7K بالشهر، فتوقع نتيجة بالآلاف مو بالملايين بالبداية.
- Cal AI نجح بفلوس وعلاقات ما عندك (شريك خبير، 250 influencer، صفقة MrBeast بـ$500K حسب مصدر ثانوي رجّعت أقل من كلفتها). وما معروف شكد يدخل هسه.
- تأكدت بنفسي من الأرقام الرئيسية الثلاثة بنتائج بحث حديثة: صفقة Cal AI، وصفحة Boothie على TrustMRR ($51,693 بآخر 30 يوم)، وحلقة Coconote. بس إعدادات الشبكة بهاي الجلسة منعت فتح بعض المواقع مباشرة (TechCrunch, TrustMRR)، فراجع الروابط قبل أي قرار كبير.

## المصادر
- [TechCrunch: MyFitnessPal اشترت Cal AI (2026-03-02)](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/)
- [GlobeNewswire: إعلان الاستحواذ](https://www.globenewswire.com/news-release/2026/03/02/3247439/0/en/myfitnesspal-acquires-cal-ai-expanding-on-its-position-as-the-leading-player-in-digital-nutrition-tracking.html)
- [Benesch: تفاصيل الصفقة](https://www.beneschlaw.com/news/benesch-advises-myfitnesspal-on-acquisition-of-cal-ai-the-viral-calorie-app/)
- [TechCrunch: بروفايل Cal AI (2025-03-16)](https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/)
- [Appfigures: تقدير شباط 2025](https://appfigures.com/resources/insights/20250228/4-this-is-where-ai-shines-%28and-generates-millions%29)
- [منشور المؤسس عن $50M ARR على X](https://x.com/zach_yadegari/status/2028473704359874652)
- [Latka: الفريق ومراحل النمو](https://getlatka.com/companies/calai.app)
- [Latka: مقابلة المؤسس (مدة البناء)](https://getlatka.com/interviews/cal-ai-zach-yadegari-2025)
- [NetInfluencer: خطة الـinfluencers](https://www.netinfluencer.com/cal-ai-founder-zach-yadegari-breaks-down-the-influencer-playbook-behind-his-apps-growth/)
- [Stormy.ai: صفقة MrBeast](https://stormy.ai/blog/scaling-cal-ai-performance-marketing-mrbeast-roi)
- [TrustMRR: صفحة Boothie](https://trustmrr.com/startup/boothie)
- [TrustMRR على X: لقطة 2026-09-23](https://x.com/trust_mrr/status/2102854405020369295)
- [Boothie على App Store](https://apps.apple.com/cy/app/boothie-ai-photo-editor/id6775603987)
- [Boothie على Google Play](https://play.google.com/store/apps/details?id=com.esmakerem.boothie)
- تطبيقات صور AI مشابهة: [AI Image Playground](https://trustmrr.com/startup/ai-image-playground)، [Visualize AI](https://trustmrr.com/startup/visualize-ai)، [Flippa](https://flippa.com/13758139)
- [TheNextWeb: صفقة Cal AI](https://thenextweb.com/news/myfitnesspal-acquires-cal-ai-the-viral-calorie-tracking-app-built-by-teens) و[Techleap: +$40M مبيعات سنوية](https://finder.techleap.nl/news/note/myfitnesspal-acquires-teen-built-cal-ai-after-40m-in-annual-sales)
- [TrustMRR: صفحة مؤسس Boothie](https://trustmrr.com/founder/keremcanseker_) و[GitHub مال المؤسس](https://github.com/keremcanseker/keremcanseker) و[شروط استخدام Boothie](https://puzzling-maize-c86.notion.site/Boothie-Terms-of-Service-3806b209577880a49d27d995e72219a0)
- [RevenueCat: حلقة Coconote ($6.7M ARR والبيع لـQuizlet)](https://www.revenuecat.com/blog/growth/brett-zack-coconote-sub-club-podcast-2026.md) و[ملخص الحلقة](https://www.betterlaunch.co/playbooks/episodes/coconote-quizlet)