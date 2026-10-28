# «وقفةُ الحُرّ»: ستوري بورد سينمائي لـ Kling 4.0

> **ملف واحد كامل.** أعطه لـ Claude Code داخل مشروع الاستوديو، وهو ينفّذه على Kling 4.0 (Higgsfield API) من أول خطوة إلى المونتاج النهائي.
> نفس القصة والأشطر والتوقيت والثياب، لكن بصورة **سينمائية حيّة** بدل خيال الظل: فيلم تاريخي بكاميرا 35mm وإضاءة درامية.

---

## 0. تعليمات لـ Claude Code (اقرأها أولاً)

1. **المشروع:** المستودع `husseinkarawi6-debug/-`، الفرع `ccr-3e631938-w45w9m`.
   - السكربت الجاهز: `storyboard/kling/generate.mjs`.
   - طريقة الاستعمال: `node generate.mjs <prompt-file> <duration> <720p|1080p>`.
   - المقاس ثابت 9:16 داخل السكربت.
2. **المفتاح:** `HF_CREDENTIALS` موجود كمتغير بيئة.
   - لا تقرأه، ولا تطبعه، ولا تحفظه في أي ملف.
   - إذا لم يكن موجوداً، توقّف وأخبرني.
3. **الأوامر:** أنشئ ملفات الأوامر من الكتل المرقّمة في القسم 6:
   - مكانها: `storyboard/kling/prompts/cine/`.
   - انسخ كل كتلة كما هي حرفياً، كل كتلة في ملف باسمها: `CINE_P1.txt`، `CINE_P2.txt`، `CINE_P3.txt`، `CINE_TAIL.txt`.
4. **التوليد مدفوع.** قبل كل طلب:
   - اطبع اسم الملف والمدة والدقة.
   - لا تعِد أي طلب فشل أكثر من مرة واحدة بدون إذني.
   - لا تقل «نجح» إلا إذا رجعت حالة `completed` ومعها `video.url`.
5. **الترتيب:**
   - ولّد أولاً **CINE_P3** وحده كاختبار، لأنه الذروة.
   - اعرض عليّ الرابط وانتظر موافقتي.
   - بعد موافقتي ولّد P1 ثم P2 ثم TAIL.
6. **بعد التوليد:** نفّذ القسم 8 (المونتاج) والقسم 9 (فحص الجودة)، وسلّمني الملفات المذكورة في القسم 10.

---

## 1. الفكرة

- **القصيدة:** قائمة بست عشرة محنة، كلها أهون من «وقفة الحرّ يرجو نوالاً بباب نحس». تُنسب إلى الإمام الشافعي.
- **الفيلم:** رجل واحد لا نرى وجهه أبداً، يعبر هذه المحن واحدةً تلو الأخرى، وثيابه ومكانه يتبدّلان مع كل شطر. يحتمل كل شيء.
- **الذروة:** يقف أمام باب لئيم، ويرفع يده ليطرق ثم لا يطرق. يستدير ويمشي نحو الشمس، فتسقط قطعة النقد في التراب ولا يلتقطها أحد.
- **الخاتمة:** الرجل نفسه في زماننا، بكنزته العنّابية أمام نافذة، ورأسه المنحني يرتفع.
- **الرسالة:** الكرامة ليست مالاً ولا وجهاً، بل هيئة.

## 2. الأسلوب السينمائي (Look)

- **الصورة:**
  - فيلم تاريخي واقعي، كأنه مصوّر على 35mm بعدسات أنامورفيك.
  - التكوين عمودي 9:16، لكنه مؤطَّر بعين سينمائية.
  - حبيبات فيلم خفيفة، وضبابية حركة طبيعية بـ 24 إطاراً.
- **الإضاءة:**
  - **ضوء خلفي قوي** (backlight / rim light) في أغلب اللقطات، فيصير البطل ظلاً أسود أو حافة ضوء.
  - ضباب جوّي يُظهر أشعة الضوء، وتباين قوي بين الضوء والظل (chiaroscuro).
- **الألوان:** ألوان ترابية خافتة، ولون مشبع واحد فقط هو **العنّابي**، لون الكرامة. يكبر حضوره مع الفيلم:

  | المشهد | العنّابي |
  |---|---|
  | البداية | خيط على الكُمّ |
  | المدبغة | حزام المريلة |
  | بيع الدار | حاشية البشت |
  | الميناء | عصابة الحمّال |
  | الباب | بطانة البشت كاملة |
  | الخاتمة | الكنزة |

- **الكاميرا:** حركات بطيئة ومتعمّدة: دوللي، وكرين، ودفع نحو الهدف (push-in)، ولقطات من فوق الكتف، وماكرو على اليدين والأشياء. ممنوع الكاميرا المحمولة المهتزّة.
- **النبرة:** جليلة ومأساوية، بلا هزل.

**لون كل مشهد:**

| الزمن (ث) | المشهد | اللون |
|---|---|---|
| 0–2.35 | الحلاق والسجن | أزرق ليلي فولاذي مع بقعة سراج كهرمانية |
| 2.35–4.90 | النزع والأمس | فضي، ثم غروب برتقالي ينطفئ إلى أزرق |
| 4.90–7.35 | البرد | أبيض مزرق |
| 7.35–9.60 | المدبغة | بنّي ترابي تحت سماء سوداء |
| 9.60–11.50 | الضب والدب | ليل أزرق عميق مع نار كهرمانية |
| 11.50–14.20 | الأرض البور | أوكر شاحب محروق |
| 14.20–16.50 | النار والعار | جمر أحمر، ثم رمادي الغسق |
| 16.50–18.85 | بيع الدار | سيبيا دافئ |
| 18.85–21.05 | الخف والرفيق | أوكر الغروب، ويبرد عند 20.7 |
| 21.05–23.35 | الميناء | أخضر بحري ليلي |
| 23.35–28.85 | الباب | ذهبي الفجر، والباب أسود ميّت |
| 28.85–29.57 | الحاضر | ضوء نافذة فضي |

## 3. البطل وقاعدة الوجه

**الشكل:**
- رجل في منتصف العشرينات، رياضي البنية، عريض الكتفين.
- شعر داكن كثيف مموّج كيرلي.
- لحية قصيرة داكنة تظهر كحافة على الفك فقط.
- نظارة رفيعة بإطار سلكي دائري، يلمع ذراعها خلف الأذن.

**قاعدة الوجه (إلزامية في كل لقطة):**
- الوجه **لا يظهر أبداً**.
- نراه فقط بإحدى هذه الطرق: من الخلف، أو ظلاً أسود أمام ضوء ساطع، أو في ظل كثيف، أو بجزء من جسده (يدان، قدمان، كتفان، ظلّه على الأرض).
- لا لقطة أمامية ولا ثلاثة أرباع، ولا عين ولا فم.
- لا يتكلم أبداً، والصوت راوٍ من خارج الصورة.

**الثياب تتغيّر مع كل مكان:**

| المشهد | الثياب |
|---|---|
| الحلاق | ثوب قطني كريمي |
| السجن | خيش رمادي ممزق وقيد حديد |
| النزع | ثوب نوم كتّاني أبيض |
| السطح | ثوب رملي بحزام منسوج وعباءة صوف داكنة |
| الثلج | فروة بلون المَغْرة وشماغ صوف |
| المدبغة | مريلة جلد بحزام عنّابي |
| الصحراء والدب | دشداشة أوكر مشمّرة وصدرية فرو، وعصابة بخيط عنّابي |
| الحقل | ثوب فلاح بلون القش وحزام حبل |
| الموقد | ثوب رمادي ملطّخ بالسخام |
| الزقاق | عباءة داكنة مسحوبة على الرأس (التقنّع) |
| بيع الدار | ثوب تاجر كريمي، وبشت بنّي باهت بحاشية عنّابية مهترئة |
| الخف | عباءة مسافر مرقّعة وقدمان حافيتان |
| الميناء | صدرية حمّال خضراء وعصابة عنّابية |
| الباب | ثوب أبيض نظيف، وبشت أسود قديم ببطانة عنّابية وحاشية ذهبية مرتوقة |
| الخاتمة | كنزة عنّابية بياقة عالية وبنطال أسود عالي الخصر |

**الشخصيات الأخرى:** لا وجوه لها. يظهرون أيدياً أو ظلالاً فقط.
- **اللئيم:** يد مكتنزة كثيرة الخواتم بخاتم عقيق أحمر. هي نفسها التي تشتري الدار، وهي نفسها التي تتدلّى من الكوّة.

**العنف رمزي فقط:** ظلال، وأشياء، ووميض. لا دم ولا جرح ولا ضرب ظاهر. الحبل لا يلمس جسده أبداً.

## 4. خريطة الزمن (مقيسة من الصوت، بدقة ±0.25 ث تقريباً)

| الشطر | الزمن (ث) | النص |
|---|---|---|
| 1 | 0.00–2.35 | لِقَلعُ ضِرسٍ وَضَربُ حَبسٍ |
| 2 | 2.35–4.90 | وَنَزعُ نَفسٍ وَرَدُّ أَمسِ |
| 3 | 4.90–7.35 | وَقَرُّ بَردٍ وَقَودُ فَردِ |
| 4 | 7.35–9.60 | وَدَبغُ جِلدٍ بِغَيرِ شَمسِ |
| 5 | 9.60–11.50 | وَأَكلُ ضَبٍّ وَصَيدُ دُبٍّ |
| 6 | 11.50–14.20 | وَصَرفُ حَبٍّ بِأَرضِ خَرسِ |
| 7 | 14.20–16.50 | وَنَفخُ نارٍ وَحَملُ عارٍ |
| 8 | 16.50–18.85 | وَبَيعُ دارٍ بِرُبعِ فِلسِ |
| 9 | 18.85–21.05 | وَبَيعُ خُفٍّ وَعَدمُ إِلفٍ |
| 10 | 21.05–23.35 | وَضَربُ إِلفٍ بِحَبلِ قَلسِ |
| 11 | 23.35–26.00 | أَهوَنُ مِن وَقفَةِ الحُرِّ |
| 12 | 26.00–28.85 | يَرجو نَوالاً بِبابِ نَحسِ |
| ذيل | 28.85–29.57 | موسيقى فقط |

**ضربات السين** (نقاط القطع والذروات الصغيرة): 0.93، 1.98، 2.89، 3.41، 4.48، 9.01، 9.30، 10.93، 12.04، 13.86، 18.45، **23.07** (أقواها)، 28.54.

**وقفات داخلية:** 6.30، 10.30، 12.70، 19.95. عند 20.70 تدخل وتريات عالية.

## 5. الستوري بورد: 21 لقطة

| # | الزمن (ث) | ماذا نرى | الكاميرا | كيف يختفي الوجه |
|---|---|---|---|---|
| S01 | 0.00–1.00 | دكان حلاق جرّاح ليلاً تحت قوس، وسراج زيت يرتجف. ماكرو على كلّاب حديد في يد الحلاق يلمع. على الجدار ظل الكلّاب ضخماً ينطبق ثم يرتدّ بقوة عند 0.93 | ماكرو، ثم دفع نحو الجدار | البطل من الخلف، ويده تقبض على المقعد |
| S02 | 1.00–2.35 | زنزانة حجرية، وأشعة قمر زرقاء من نافذة بقضبان. يجلس على مقعد حجري بخيش وقيد. ظل عصا السجّان على الجدار. باب الحديد يُصفق عند 1.98، ويتطاير الغبار | ثابتة واسعة، ثم ارتجاج الصفقة | ظهره للكاميرا |
| S03 | 2.35–3.65 | غرفة عارية عند الغسق. يجثو قرب نافذة ضيقة ساطعة بثوب كتّان أبيض. حمامة بيضاء على العتبة تطير خارجاً عند 3.41، وهي الروح | جانبية، ثم إمالة مع الحمامة | ظل أسود أمام النافذة |
| S04 | 3.65–4.90 | سطح طيني عند الغروب فوق مدينة قباب. يشدّ حبلاً ثقيلاً نحو الشمس الغاربة. الشمس تغرب رغمه، ويبهت اللون عند 4.48 | من الخلف، كرين صاعد | ظهره، وظل أمام الشمس |
| S05 | 4.90–6.30 | عاصفة ثلج. فروة وشماغ، والثلج يتراكم على كتفيه، ويرتجف | متوسطة من الخلف | ظهره |
| S06 | 6.30–7.35 | لقطة جوية لسهل أبيض بلا نهاية. شخص صغير يقود جملاً عنيداً بخطامه، وعلى السرج قرد صغير يرتجف | درون من أعلى، حركة جانبية | بعيد جداً |
| S07 | 7.35–9.60 | مدبغة تحت سحب سوداء، جلود معلّقة، وبخار من الأحواض. يرفع جلداً يقطر على إطار، ثم تُميل الكاميرا إلى السماء فتبتلع الغيوم آخر الشمس عند 9.01–9.30 | جانبية، ثم إمالة للأعلى | جانبية ظلية، والرأس للأعلى أمام سماء رمادية |
| S08 | 9.60–11.50 | وادٍ صخري ليلاً ونار صغيرة. يُنزل سيخاً عليه ضب مشوي، وكتفاه ترتجفان قرفاً. ترجع الكاميرا للخلف فينكشف دب ضخم ينتصب على الحافة أمام القمر عند 10.93 | من خلفه عند النار، ثم سحب للخلف وكرين | ظهره، والنار أمامه |
| S09 | 11.50–12.70 | حقل محروق تحت شمس بيضاء. ينثر الحَبّ في قوس واسع بحركة بطيئة عند 12.04، فيرتدّ الحَبّ عن الأرض الصلبة | جانبية منخفضة، بحركة بطيئة | ظل أمام سماء بيضاء |
| S10 | 12.70–14.20 | ماكرو على تراب متشقّق، الحَبّ يسقط في الشقوق ولا شيء ينبت، والشق يُطبق غباراً. في العمق يتكئ على معوله. كرة شوك تتدحرج عند 13.86 | ماكرو، ثم سحب بؤري (rack focus) إلى العمق | بعيد وخارج البؤرة |
| S11 | 14.20–15.35 | موقد طيني ليلاً. يجثو وينفخ الجمر، فيرتدّ الدخان عليه | قريبة من الخلف على مستوى الأرض | رأسه وكتفاه تحجب الموقد |
| S12 | 15.35–16.50 | زقاق سوق ضيق عند الغسق. يمشي منحنياً وعباءته مسحوبة على رأسه. ظلال أيدٍ تشير إليه على الجدران، ومارّة بلا ملامح خارج البؤرة يديرون ظهورهم | تتبّع من الخلف | العباءة تغطي رأسه، والكاميرا خلفه |
| S13 | 16.50–18.85 | باب بيته المنقوش. يضع مفتاحاً حديدياً في يد مكتنزة بخاتم عقيق. اليد تكسر فلساً نحاسياً أربعاً، وتُسقط الربع في كفه عند 18.45. الباب يُغلق خلفه | من فوق الكتف، ماكرو على الأيدي | يداه فقط |
| S14 | 18.85–19.95 | درجات سوق عند الغروب. قدمان حافيتان على حجر ساخن، ويداه تسلّمان خفاً جلدياً بالياً ليد نحيلة مقابل رغيف | ماكرو على القدمين واليدين | لا يظهر إلا الأيدي والأقدام |
| S15 | 19.95–21.05 | جدار طيني طويل والشمس منخفضة. ظلّان طويلان يمشيان معاً، فيتلاشى ظل الرفيق في رمال تذروها الريح، ويكمل ظله وحده. يبرد اللون عند 20.7 | جانبية ثابتة على الجدار | ظلال فقط |
| S16 | 21.05–23.35 | ميناء ليلاً في عاصفة بلون أخضر بحري. حمّال منحنٍ تحت لفّة حبال. حبل سفينة غليظ يجلد الشراع مراراً كأفعى بحرية. عند 23.07 يشتدّ الحبل ويضرب برق أبيض فيملأ الصورة | من الخلف منخفضة، ثم دفع نحو الحبل | ظهره، والليل |
| S17 | 23.35–24.75 | ساحة متناظرة فارغة في فجر ذهبي. باب أسود شاهق بمسامير نحاسية ومطرقة حلقية. يقف صغيراً بثوب أبيض وبشت أسود ببطانة عنّابية. على الأعمدة تمرّ ظلال محنه الصغيرة: كلّاب، قضبان، دب، حبل | كرين نازل، ثم دفع بطيء جداً | ظهره |
| S18 | 24.75–26.00 | ظل الباب الضخم يزحف على البلاط ويبتلع ظله، ورأسه ينحني | منخفضة من فوق الكتف | ظهره |
| S19 | 26.00–27.50 | ماكرو: يده في كُمّ بطانته عنّابية، على بُعد إصبع من المطرقة، ترتجف ولا تلمسها. كوّة تُفتح عند 26.9، وتتدلّى منها اليد المكتنزة بفلس على خيط. يده تنزل | ماكرو جانبي على مستوى اليد | اليد فقط |
| S20 | 27.50–28.85 | لقطة معاكسة من داخل عتمة الباب عبر الكوّة. هو قد ابتعد يمشي نحو شمس طالعة، ويستقيم، وظله الطويل يمتدّ إلى الباب. الفلس يسقط في التراب، والكوّة تُصفق عند 28.54 | معاكسة، إطار داخل إطار | ظهره، وبعيد |
| S21 | 28.85–29.57 | الحاضر: غرفة حديثة فيها نباتات متدلية، ولوح خشبي مخطّط، وخريطة عالم قديمة. يقف أمام نافذة ساطعة بكنزة عنّابية وبنطال أسود، ورأسه المنحني يرتفع حتى يستقيم | متوسطة واسعة من الخلف، دفع خفيف | ظهره وظلّه أمام النافذة |

## 6. أوامر Kling 4.0 (انسخها حرفياً إلى ملفات)

**خطة التوليد الموصى بها:** ثلاثة أجزاء متعددة اللقطات، وخاتمة وحدها.

| الملف | المدة | يغطي | الدقة |
|---|---|---|---|
| CINE_P1.txt | 10 ث | 0.00–9.60 (الأشطر 1–4) | 1080p |
| CINE_P2.txt | 10 ث | 9.60–18.85 (الأشطر 5–8) | 1080p |
| CINE_P3.txt | 10 ث | 18.85–28.85 (الأشطر 9–12) | 1080p |
| CINE_TAIL.txt | 4 ث | 28.85–29.57 (الخاتمة) | 1080p |

بعد التوليد يُقصّ كل جزء ويُضبط على حدود الأشطر في المونتاج. للتجربة الأرخص استعمل 720p.

**السعر:** سعر الـ API غير منشور. على موقع Higgsfield كان Kling 4.0 بـ 3.25 كريدت/ث بدقة 1080p، و2.25 كريدت/ث بدقة 720p، فالمجموع 34 ثانية تقريباً.

### CINE_P1
```
Photoreal live-action historical film, shot on 35mm anamorphic, vertical 9:16. Natural and practical light only, hard backlight and rim light, volumetric haze, deep chiaroscuro, muted earth palette with one deep burgundy accent, fine film grain, 24fps motion blur, slow deliberate camera moves. Solemn, tragic, epic.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear. His face is NEVER visible: he is always seen from behind, as a black silhouette against bright light, in deep shadow, or only as hands and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written.
Shot 1: Night. A cold stone prison cell lit by blue moonlight through a high barred window and one amber oil lamp. In a ragged grey-brown sackcloth tunic with iron shackles and a thin burgundy cord at one wrist, he sits on a stone bench with his back to camera. On the wall the huge shadow of iron pincers closes and jerks back. The heavy iron door slams shut and dust shakes from the ceiling.
Shot 2: Hard cut. A bare room at dusk, a narrow bright window. In a white linen night-robe he kneels as a black silhouette against the window; a white dove lifts off the sill and flies out into the light. Then on a mud-brick rooftop at sunset he hauls on a heavy rope toward the huge sinking sun, seen from behind; the sun sinks anyway and the colour drains to blue.
Shot 3: Hard cut. A night blizzard on an endless white plain. In a bulky ochre sheepskin coat and a grey wool head-wrap, snow crusting his shoulders, seen from behind, he leans into the wind and leads one balking camel by its halter, a small shivering monkey on the saddle. Wide aerial view, the figures small.
Shot 4: Hard cut. A muddy tannery under black clouds, stretched hides on wooden frames, steam rising from the vats. In a heavy leather apron with one burgundy strap he heaves a dripping hide onto a frame in side silhouette, then the camera tilts up to the sky as black clouds swallow the last sliver of sun and the light dies.
Exactly one man, fully clothed. Other people appear only as faceless hands or shadows. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark.
```

### CINE_P2
```
Photoreal live-action historical film, shot on 35mm anamorphic, vertical 9:16. Natural and practical light only, hard backlight and rim light, volumetric haze, deep chiaroscuro, muted earth palette with one deep burgundy accent, fine film grain, 24fps motion blur, slow deliberate camera moves. Solemn, tragic, epic.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear. His face is NEVER visible: he is always seen from behind, as a black silhouette against bright light, in deep shadow, or only as hands and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written.
Shot 1: Night in a rocky mountain gorge, a huge moon. Camera directly behind him at a small campfire: in an ochre hitched-up dishdasha, a fur-trimmed vest and a head-cloth tied with a faded burgundy cord, he lowers a skewer with a roasted desert lizard and his shoulders heave with disgust. The camera pulls back and cranes up to reveal a colossal bear rising on its hind legs on the ridge, a black silhouette against the moon; he grips a long spear.
Shot 2: Hard cut. A bleached barren field under a white-hot sun. In a straw-coloured farmer's tunic with a rope belt and a seed sack, side silhouette, he casts grain in one wide slow-motion arc; the grains bounce off cracked dry earth. Macro on the cracks: nothing grows. Far behind, out of focus, he leans on his hoe as a tumbleweed rolls past.
Shot 3: Hard cut. A clay hearth glowing red at night, camera low behind him: in a soot-stained grey tunic he kneels and blows on the embers; thick smoke rolls back over him. The smoke clears into a narrow souq alley at dusk: he walks bent over, his dark wool cloak pulled over his head like a hood with a sliver of burgundy lining, while shadows of pointing hands rise on the walls and faceless out-of-focus passers-by turn their backs.
Shot 4: Hard cut. His tall carved brass-studded house door in warm sepia light, over the shoulder at hand height. In a cream merchant's robe under a faded brown bisht with a frayed burgundy trim, his hand lays a large iron house key into a plump hand heavy with rings and a carnelian signet ring. Macro: the ringed fingers snap a small copper coin into four and drop one quarter into his open palm. The door swings shut behind him.
Exactly one man, fully clothed. Other people appear only as faceless hands or shadows. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark.
```

### CINE_P3
```
Photoreal live-action historical film, shot on 35mm anamorphic, vertical 9:16. Natural and practical light only, hard backlight and rim light, volumetric haze, deep chiaroscuro, muted earth palette with one deep burgundy accent, fine film grain, 24fps motion blur, slow deliberate camera moves. Solemn, tragic, epic; the pace slows from Shot 3.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear. His face is NEVER visible: he is always seen from behind, as a black silhouette against bright light, in deep shadow, or only as hands and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written.
Shot 1: Sunset on market steps. Macro on his bare feet on hot stone and his hands in a patched traveller's cloak handing a worn leather boot to a thin bare hand in exchange for a flat loaf. Then on a long mud-brick wall in low sun, two long shadows walk side by side; the companion's shadow dissolves into blowing sand and his shadow walks on alone.
Shot 2: Hard cut. A harbour at night in a storm, sea-green light, a huge billowing sail. Low angle from behind: in a sea-green porter's vest and a burgundy head-rag he stands bent under a heavy coil of rope while a giant ship's hawser whips the sail again and again like a sea serpent, never touching him; gulls scatter. Push in on the rope as it snaps taut and a white lightning flash fills the frame.
Shot 3: From the white, a vast empty symmetrical stone courtyard at golden dawn, a slow grand crane down between pillars. A towering dead-black arched door studded with brass, a brass ring knocker, a lamp glowing above it. In a clean white ankle-length robe and one old black bisht with worn mended gold trim and a glowing burgundy lining, he stands small, back to camera. Low over his shoulder: the door's huge shadow creeps across the flagstones and swallows his shadow as his head slowly sinks.
Shot 4: Hard cut. Macro side view at hand height: his hand in the burgundy-lined sleeve hangs a finger's width from the brass knocker, trembles, and never touches it. A small hatch in the door snaps open and a plump ringed hand dangles one copper coin on a string. His hand lowers. Reverse angle from inside the dark doorway through the hatch: he is already walking away toward the blazing rising sun, back to camera, rising fully upright, his long shadow stretching back across the door. The coin drops unclaimed into the dust and the hatch slams shut.
Exactly one man, fully clothed. Other people appear only as faceless hands or shadows. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark.
```

### CINE_TAIL
```
Photoreal live-action film, shot on 35mm, vertical 9:16, soft silver window light with a warm amber edge, fine film grain, slow push-in, quiet and dignified.
A present-day room: trailing pothos vines from a high shelf, a slatted wooden wall panel, an antique world map on the wall with no readable lettering, a tall bright window. A man in his mid-twenties with broad shoulders, thick dark wavy-curly hair and thin round wire glasses stands before the window with his back to the camera, a black silhouette against the light, wearing a burgundy fine-knit turtleneck and black high-waisted pleated trousers. His head is bowed, then slowly rises until he stands fully upright, chin level, and holds. His face is never visible; he never turns toward the camera. No text, letters, logos or watermark.
```

**إذا احتجت إعادة لقطة واحدة:**
1. خذ وصفها من الجدول في القسم 5.
2. ضع قبلها نفس فقرتي الأسلوب والبطل الموجودتين في أول كل كتلة.
3. ولّدها بمدة 3 إلى 5 ثوانٍ.
4. قصّها على حدودها في المونتاج.

## 7. نقاط التزامن في كل جزء

| الجزء | يوضع عند | حدود اللقطات بزمن الجزء | بالزمن العام | يُقصّ عند |
|---|---|---|---|---|
| P1 | 0.00 | 2.35 / 4.90 / 7.35 | نفسها | 9.60 |
| P2 | 9.60 | 1.90 / 4.60 / 6.90 | 11.50 / 14.20 / 16.50 | 18.85 (9.25 ث محلياً) |
| P3 | 18.85 | 2.20 / 4.50 / 7.15 | 21.05 / 23.35 / 26.00 | 28.85 (10.00 ث محلياً) |
| TAIL | 28.85 | — | — | 29.57 (0.72 ث) |

**أحداث يجب أن تقع في وقتها:**

| الزمن (ث) | الحدث |
|---|---|
| 1.98 | صفقة الباب |
| 3.41 | طيران الحمامة |
| 9.01 | انطفاء الشمس |
| 10.93 | قيام الدب |
| 12.04 | نثر الحَبّ |
| 18.45 | سقوط ربع الفلس |
| 23.07 | البرق الأبيض |
| 26.9 | انفتاح الكوّة |
| 28.54 | صفقة الكوّة |

## 8. المونتاج (Claude Code ينفّذه بـ ffmpeg وRemotion)

1. **الصوت:** استخرجه من فيديو القصيدة الأصلي (`VID_20261027_165024_693.mp4`) بدون تعديل:
   `ffmpeg -i VID.mp4 -vn -c:a copy audio_master.m4a`
   مدته 29.57 ث، ويُوضع على 0.00. لا يُغيَّر فيه شيء.
2. **اكتشاف القطوع:** اكتشف القطوع داخل كل جزء بـ PySceneDetect أو بـ `select='gt(scene,0.3)'`.
3. **ضبط التوقيت:** غيّر سرعة كل لقطة بـ `setpts` بين 75% و125%، أو جمّد آخر إطاراتها بـ `tpad`، حتى تنتهي على حدّها في القسم 7.
4. **الربط:** اربط الأجزاء بـ concat. المدة النهائية **29.57 ث**، والمقاس **1080×1920** بـ **24 إطاراً/ث**.
5. **مؤثرات الضمان** (إن لم تظهر في التوليد):
   - وميض أبيض 4–6 إطارات عند 23.07.
   - إطفاء تدريجي للسطوع بنسبة 40% بين 9.01 و9.30.
   - قناع قوس أسود ينغلق في 3 إطارات عند 28.54 ويترك شقّ ضوء يتسع إلى الأبيض حتى 28.85.
6. **التلوين:**
   - وحّد اللون بين الأجزاء بمنحنى خفيف دافئ، وحافظ على العنّابي.
   - حبيبات خفيفة: `noise=alls=4:allf=t`.
   - تظليل حواف: `vignette=PI/5.5`.
7. **النص العربي:** بخط Amiri Bold، بنفس مواصفات `storyboard/CLAUDE_CODE_PROMPT.md`، الخطوة 5.
   - كل شطر يظهر في وقته، كأن الحبر يتشرّبه الورق من اليمين.
   - كلمات القافية تتوهّج بالعنّابي #7E1F2D: أَمسِ 4.48، شَمسِ 9.30، خَرسِ 13.86، فِلسِ 18.45، قَلسِ 23.07، نَحسِ 28.54.
   - البيت الأخير يظهر كلمة كلمة، و«نَحسِ» تُختم عند 28.54.
   - مكان النص بين y≈1180 وy≈1480. سطر النسبة «تُنسب إلى الإمام الشافعي» من 0.30 إلى 4.70.
   - استعمل Remotion أو المتصفح لرسم النص، لا drawtext، حتى لا تنقطع الحروف العربية.
8. **التصدير:**
   - `final_cinematic_with_text.mp4` و`final_cinematic_clean.mp4`.
   - H.264، معدل 12–16 Mbps، صوت AAC بمعدل 256k.

## 9. فحص الجودة قبل التسليم

- [ ] **لا وجه ولا عين ولا فم في أي إطار.**
  - شغّل كشف الوجوه (MediaPipe أو OpenCV) على كل 3 إطارات، ثم راجع النتائج بعينك.
  - أي إطار فيه وجه: احذفه، أو جمّد الإطار السابق، أو قصّ الإطار.
- [ ] الثياب تتغيّر بين المشاهد كما في الجدول، والعنّابي حاضر ويكبر.
- [ ] لا دم ولا عنف ظاهر، ولا نص مولّد داخل الصورة.
- [ ] الأحداث المهمة على وقتها: 1.98، 10.93، 18.45، 23.07، 28.54.
- [ ] المدة 29.57 ث (±1 إطار)، والصوت الأصلي لم يُمسّ.
- [ ] النص العربي متصل الحروف، والتشكيل سليم، ومقروء على الموبايل.

## 10. التسليم

- `final_cinematic_with_text.mp4` و`final_cinematic_clean.mp4`.
- روابط الأجزاء الأربعة الأصلية من Kling، ورقم كل طلب (`request_id`).
- `contact_sheet.png`: إطار من كل شطر، مع الزمن.
- `QA_REPORT.md`، ويحتوي:
  - ما تولّد وكم ثانية.
  - ما أُعيد ولماذا.
  - أي إطار حُذف بسبب الوجه.
  - السرعات المستعملة لكل لقطة.
  - أي مشكلة لم تُحل.
