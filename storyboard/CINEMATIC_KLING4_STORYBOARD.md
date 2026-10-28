# «وقفةُ الحُرّ»: ستوري بورد سينمائي لـ Kling 4.0 (النسخة القوية)

> **ملف واحد كامل.** أعطه لـ Claude Code في مشروع الاستوديو، فيولّد كل شيء على Kling 4.0 (Higgsfield API) ويركّب الفيلم حتى النهاية.
> **ممنوع أي نص أو كتابة على الفيديو.** يُسلَّم بالصورة وصوت القصيدة الأصلي فقط.

---

## 0. تعليمات لـ Claude Code (اقرأها أولاً)

1. **المشروع:** المستودع `husseinkarawi6-debug/-`، الفرع `ccr-3e631938-w45w9m`.
   - السكربت: `storyboard/kling/generate.mjs`.
   - الاستعمال: `node generate.mjs <prompt-file> <duration> <720p|1080p>`، والمقاس 9:16 ثابت.
2. **المفتاح:** `HF_CREDENTIALS` من البيئة أو من `.env.local`.
   - لا تقرأه، ولا تطبعه، ولا تحفظه في أي ملف.
   - إذا لم يكن موجوداً، توقّف وأخبرني.
3. **ملفات الأوامر:** انسخ كل كتلة من القسم 7 حرفياً إلى ملف في `storyboard/kling/prompts/cine/`:
   - `CINE_P1.txt`، `CINE_P2.txt`، `CINE_P3.txt`، `CINE_TAIL.txt`.
4. **التوليد:** ولّد الأربعة دفعة واحدة بدقة **1080p**، بلا اختبار مسبق ولا انتظار لموافقتي.
   - اطبع اسم كل ملف ومدته ودقته قبل إرساله.
   - إذا فشل طلب، أعِده مرة واحدة فقط.
   - لا تقل «نجح» إلا إذا رجعت حالة `completed` ومعها `video.url`.
5. **بعد التوليد:** نفّذ بالترتيب:
   - القسم 8: الانتقالات والمؤثرات.
   - القسم 9: المونتاج.
   - القسم 10: فحص الجودة.
   - ثم سلّمني ما في القسم 11.
6. **لا تضع أي كلمة على الفيديو**، ولا تولّد أي شيء خارج هذا الملف.

---

## 1. القصة: «كل شيء يُنتزع منه… إلا كرامته»

القصيدة (تُنسب إلى الإمام الشافعي) قائمة بمحن كلها «أهونُ من وقفةِ الحُرِّ يرجو نوالاً ببابِ نحسِ».

**الخط الدرامي:**
- رجل حرّ يُجرَّد من كل شيء، مشهداً بعد مشهد.
- **اليد نفسها** تظهر في المحن كلها: يد مكتنزة بخواتم وخاتم عقيق أحمر، يد اللئيم. تمدّ له النجاة بثمن الذل: فلس، أو مفتاح، أو بطانية، أو صحن طعام.
- في كل مرة **يرفض** ويختار المحنة.
- **الرمز:** خيط عنّابي معقود على معصمه، هو كرامته. كلما خسر شيئاً بقي الخيط.

**الخسارات بالترتيب:**

| | خسر |
|---|---|
| 1 | الصحة |
| 2 | الحرية |
| 3 | الروح والعمر |
| 4 | الماضي |
| 5 | الدفء |
| 6 | الرزق |
| 7 | الأمان |
| 8 | الأمل |
| 9 | السمعة |
| 10 | البيت |
| 11 | الحذاء |
| 12 | الصديق |
| 13 | الجسد المتعب |

في القاع لا يبقى معه إلا الخيط.

**الذروة:**
- يقف أخيراً أمام **باب اللئيم نفسه**.
- تُفتح الكوّة ويتدلّى **كيس ذهب كامل**.
- ينظر إلى الخيط على معصمه، فينزل يده، ويستدير، ويمشي نحو الشمس.
- الذهب يسقط في التراب ولا يلتفت إليه، والكوّة تنصفق.

**الخاتمة:** هو اليوم بكنزته العنّابية أمام نافذته، ونفس الخيط على معصمه، ورأسه يرتفع.
**الرسالة:** خسر كل شيء… ولم يخسر نفسه.

## 2. لغة التصوير

- **الشكل:** فيلم تاريخي واقعي.
  - مصوّر على 35mm أنامورفيك، بحبيبات ناعمة ووهج عدسات أفقي (anamorphic flares).
  - عمق ميدان ضحل، وضبابية حركة بـ 24 إطاراً.
  - التكوين عمودي 9:16 بعين سينمائية.
- **الإضاءة:**
  - ضوء خلفي قوي في كل لقطة تقريباً، فيصير البطل ظلاً أو حافة ضوء.
  - ضباب جوّي، وأشعة ضوء (god rays)، وغبار يسبح في الضوء، وتباين قوي (chiaroscuro).
- **العدسات والحركة:**

  | النوع | العدسة | الاستعمال |
  |---|---|---|
  | لقطات واسعة | 24mm | المكان والوحدة |
  | لقطات متوسطة | 50mm | الجسد والحركة |
  | ماكرو | 100mm | اليدان، والخيط، والفلس، والعين على الأشياء |

  حركات بطيئة ومحكمة: دوللي، كرين، دفع نحو الهدف، كاميرا علوية (top-down)، وتتبّع جانبي.

- **السرعة:** إبطاء شديد (slow motion) في لحظات الرمز:
  - طيران الحمامة.
  - نثر الحَبّ.
  - سقوط الفلس.
  - سقوط الذهب.

  وتسريع مفاجئ (speed ramp) عند الصدمات:
  - صفقة الباب.
  - قيام الدب.
  - فرقعة الحبل.

- **اللون:** ألوان ترابية خافتة. العنّابي هو اللون المشبع الوحيد، ويكبر مع الفيلم.
- **النبرة:** جليلة ومأساوية وملحمية، بلا هزل.

## 3. البطل وقاعدة الوجه

**الشكل:**
- منتصف العشرينات، رياضي عريض الكتفين.
- شعر داكن كثيف مموّج كيرلي.
- لحية قصيرة داكنة تظهر كحافة على الفك فقط.
- نظارة رفيعة بإطار سلكي دائري، يلمع ذراعها خلف الأذن.
- **خيط عنّابي معقود على معصمه الأيمن في كل مشهد.**

**قاعدة الوجه (إلزامية):**
- **الوجه لا يظهر أبداً.**
- نراه من الخلف، أو ظلاً أمام ضوء، أو في ظل كثيف، أو يدين وقدمين وظلاً فقط.
- لا لقطة أمامية ولا ثلاثة أرباع، ولا عين ولا فم.
- لا يتكلم أبداً.

**الثياب تتغيّر في كل مكان:**

| المشهد | الثياب |
|---|---|
| الحلاق | ثوب قطني كريمي |
| السجن | خيش رمادي ممزق وقيد حديد |
| النزع | ثوب كتّان أبيض |
| السطح | ثوب رملي وعباءة صوف داكنة |
| الثلج | فروة بلون المَغْرة وشماغ صوف |
| المدبغة | مريلة جلد |
| الضب والدب | دشداشة أوكر وصدرية فرو |
| الحقل | ثوب فلاح بلون القش |
| الموقد والزقاق | ثوب رمادي ملطّخ بالسخام، وعباءة داكنة مسحوبة على الرأس |
| بيع الدار | ثوب تاجر كريمي وبشت بنّي باهت |
| الخف | عباءة مسافر مرقّعة، حافي القدمين |
| الميناء | صدرية حمّال خضراء |
| الباب | ثوب أبيض نظيف وبشت أسود قديم ببطانة عنّابية وحاشية ذهبية مرتوقة |
| الخاتمة | كنزة عنّابية وبنطال أسود |

**الآخرون:** بلا وجوه أبداً، أيدٍ أو ظلال فقط.
- **اللئيم:** يد مكتنزة كثيرة الخواتم بخاتم عقيق أحمر، وكمّ حريري مطرّز بالذهب.

**العنف رمزي:** ظلال، وأشياء، وبرق. لا دم ولا جرح، والحبل لا يلمسه.

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

**ضربات السين** (نقاط القطع): 0.93، 1.98، 2.89، 3.41، 4.48، 9.01، 9.30، 10.93، 12.04، 13.86، 18.45، **23.07** (أقواها)، 28.54.

**وقفات:** 6.30، 10.30، 12.70، 19.95. عند 20.70 تدخل الوتريات العالية وتبدأ الذروة.

## 5. الستوري بورد: 21 لقطة

| # | الزمن (ث) | القصة والصورة | التصوير | المؤثر |
|---|---|---|---|---|
| S01 | 0.00–1.00 | دكان حلاق جرّاح ليلاً. كلّاب حديد يقترب من فمه، ومن الظلام تمتدّ يد اللئيم بفلس: ادفع لتنجو من الألم. يقبض يده على الخيط العنّابي ويرفض. ظل الكلّاب على الجدار يرتدّ بقوة عند 0.93 | ماكرو 100mm على اليدين، ثم دفع نحو الظل | سراج يرتجف، ودخان زيت |
| S02 | 1.00–2.35 | زنزانة. اليد تمرّر مفتاح الزنزانة أمام القضبان فلا يمدّ يده. باب الحديد يُصفق عند 1.98 | ثابتة من الخلف، ثم ارتجاج الصفقة مع تسريع | غبار يسقط من السقف، وأشعة قمر زرقاء |
| S03 | 2.35–3.65 | غرفة عارية، يجثو مريضاً أمام نافذة ساطعة. حمامة بيضاء تطير من صدره عبر النافذة (روحه) عند 3.41 | ظل جانبي، ثم إمالة مع الحمامة | إبطاء 120fps، وريش يسبح في الضوء |
| S04 | 3.65–4.90 | سطح طيني عند الغروب. يشدّ الشمس بحبل ليرجع الأمس، فينقطع الحبل في يده وتغرب الشمس عند 4.48 | كرين صاعد من الخلف | وهج عدسة شمسي، والألوان تنطفئ إلى رمادي |
| S05 | 4.90–6.30 | عاصفة ثلج. نافذة دافئة تُفتح على جنبه واليد تمدّ بطانية، فيمشي أمامها ولا يقف | متوسطة من الخلف بعدسة 50mm | ثلج كثيف، وبخار النفس، وضوء النافذة الدافئ يتلاشى خلفه |
| S06 | 6.30–7.35 | سهل أبيض لا نهاية له. يقود وحده جملاً عنيداً عليه قرد يرتجف | درون علوي بحركة جانبية | آثار أقدام طويلة في الثلج |
| S07 | 7.35–9.60 | مدبغة. يرفع جلداً يقطر على إطار، والغيوم تبتلع الشمس فيضيع تعبه | جانبية ظلية، ثم إمالة إلى السماء | بخار الأحواض، والضوء يموت عند 9.01–9.30 |
| S08 | 9.60–11.50 | ليلاً عند النار. اليد تضع صحن طعام فاخراً على صخرة، فيدفعه بقدمه ويأكل الضب المرّ. يقوم خلفه دب ضخم أمام القمر عند 10.93 | من خلفه عند النار، ثم سحب للخلف وكرين | شرر يتطاير، وارتجاج الكاميرا مع قيام الدب |
| S09 | 11.50–12.70 | حقل محروق تحت شمس بيضاء. ينثر آخر حبّاته عند 12.04 | جانبية منخفضة | تجميد شبه كامل (bullet-time) والحَبّ معلّق في الهواء |
| S10 | 12.70–14.20 | الحَبّ يسقط في الشقوق ولا ينبت شيء. الشق يُطبق عند 13.86. في العمق يتكئ على معوله | ماكرو، ثم سحب بؤري (rack focus) إلى العمق | غبار ساخن، وتموّج الحرارة |
| S11 | 14.20–15.35 | موقد. ينفخ ناراً لا تشتعل، فيرتدّ الدخان عليه | منخفضة من الخلف | جمر أحمر، ودخان كثيف يملأ الصورة |
| S12 | 15.35–16.50 | زقاق السوق. يمشي مغطّى الرأس، والأيدي تشير إليه، والمارّة بلا ملامح يديرون ظهورهم | تتبّع من الخلف، وأشخاص خارج البؤرة | ظلال الأيدي تكبر على الجدران |
| S13 | 16.50–18.85 | باب بيته. يسلّم المفتاح لنفس اليد، فتكسر فلساً أربعاً وتعطيه الربع عند 18.45. الباب يُغلق | من فوق الكتف، وماكرو على الأيدي والخيط | إبطاء لسقوط الربع، ولمعة نحاس |
| S14 | 18.85–19.95 | درجات السوق. قدماه الحافيتان على حجر ساخن، يبيع حذاءه برغيف | ماكرو على القدمين واليدين | تموّج حرارة |
| S15 | 19.95–21.05 | جدار طويل. ظلّه وظل صديقه يمشيان معاً، فيتفتت ظل الصديق رملاً ويمضي ظله وحده | جانبية ثابتة على الجدار | عاصفة رمل، واللون يبرد عند 20.7 |
| S16 | 21.05–23.35 | ميناء في عاصفة ليلاً. حمّال منحنٍ تحت الحبال، وحبل السفينة الغليظ يجلد الشراع ألف مرة. عند 23.07 يشتدّ الحبل ويضرب برق | منخفضة من الخلف، ثم دفع سريع نحو الحبل | مطر أفقي، ورذاذ بحر، وبرق أبيض كامل |
| S17 | 23.35–24.75 | فجر ذهبي. ساحة متناظرة وباب أسود شاهق. على الأعمدة تمرّ ظلال كل ما خسره: الكلّاب، والقضبان، والبيت، وظل الصديق | كرين نازل ودفع بطيء جداً | أشعة ذهبية وغبار معلّق |
| S18 | 24.75–26.00 | ظل الباب يزحف ويبتلع ظله، ورأسه ينحني لأول مرة | منخفضة من فوق الكتف | الظل يتحرك والضوء ثابت |
| S19 | 26.00–27.50 | ماكرو: يده ترتفع نحو المطرقة وترتجف، والخيط العنّابي يلمع. تُفتح الكوّة عند 26.9 ويتدلّى منها كيس ذهب. ينظر إلى الخيط، فتنزل يده | ماكرو جانبي، وسحب بؤري من الذهب إلى الخيط | لمعة الذهب، ونبض ضوء على الخيط |
| S20 | 27.50–28.85 | لقطة معاكسة من داخل عتمة الباب: يبتعد نحو الشمس ويستقيم ظهره. الكيس يسقط وتتناثر العملات في التراب، والكوّة تُصفق عند 28.54 | معاكسة، إطار داخل إطار | إبطاء لسقوط الذهب، ووهج شمس |
| S21 | 28.85–29.57 | الحاضر: غرفته (نباتات متدلية، لوح خشبي، خريطة قديمة). بكنزة عنّابية أمام النافذة، والخيط على معصمه، ورأسه يرتفع | متوسطة من الخلف، دفع خفيف | ضوء نافذة فضي |

## 6. الانتقالات المميزة

بعضها يُكتب داخل أمر Kling، وكلها **مضمونة في المونتاج** بالقسم 8.

| # | عند (ث) | من ← إلى | النوع |
|---|---|---|---|
| T1 | 1.00 | ظل الضرس ← ثقب قفل الزنزانة | **قطع مطابق بالشكل** (match cut): الضرس يدور ويصير القفل |
| T2 | 2.35 | الباب يُصفق إلى السواد ← شقّ ضوء ← نافذة الغرفة | **من الأسود إلى الضوء** |
| T3 | 3.65 | جناح الحمامة الأبيض يملأ الشاشة ← قرص الشمس | **مسح بالحركة** (whip-match) |
| T4 | 4.90 | الشمس تنطفئ ← اللون يبهت إلى أبيض ← ثلج | **تبييض كامل** (white-out) |
| T5 | 6.30 | ثلج يملأ العدسة ← لقطة جوية | **صعود عبر الثلج** |
| T6 | 7.35 | آثار الأقدام في الثلج ← نسيج الجلد المشدود | **مطابقة ملمس** (texture match) |
| T7 | 9.60 | الغيمة تُغلق كالباب إلى السواد ← شرارة نار تولد في العتمة | **ولادة الضوء** |
| T8 | 11.50 | زئير الدب، والقمر يُحجب، والصورة ترتجّ ← شمس بيضاء حارقة | **قطع صادم** (smash cut) |
| T9 | 12.70 | الحَبّ المعلّق في الهواء ← الحَبّ في الشقوق | **مطابقة بالسقوط**، من التجميد إلى الماكرو |
| T10 | 14.20 | الشق يُطبق ← توهّج الجمر | **قطع صادم أحمر** |
| T11 | 15.35 | الدخان يملأ الصورة ← ينقشع عن الزقاق | **مسح بالدخان** |
| T12 | 16.50 | الأيدي التي تشير ← يد اللئيم تستلم المفتاح | **مطابقة اليد** |
| T13 | 18.85 | ربع الفلس يسقط ← قدم حافية تنزل على الحجر | **مطابقة بالسقوط** |
| T14 | 21.05 | عاصفة الرمل ← رذاذ البحر | **مسح بالجزيئات**: رمل يتحول ماءً |
| T15 | 23.35 | البرق الأبيض ← يذوب إلى فجر ذهبي | **تبييض كامل ثم ذوبان** |
| T16 | 24.75 | بدون قطع | **لقطة واحدة متصلة**: الظل يبتلعه |
| T17 | 26.00 | ظله الصغير ← يده الكبيرة | **قطع على الحركة** (cut on action) |
| T18 | 28.54 | الكوّة تُصفق ← قوس أسود ينغلق ← شقّ ضوء ← نافذة الحاضر | **إغلاق على شكل قوس** (iris) ثم فتح |

## 7. أوامر Kling 4.0 (انسخها حرفياً)

**خطة التوليد:**

| الملف | المدة | يغطي | الدقة |
|---|---|---|---|
| CINE_P1.txt | 5 ث | 0.00–4.90 (الأشطر 1–2) | 1080p |
| CINE_P2.txt | 10 ث | 4.90–14.20 (الأشطر 3–6) | 1080p |
| CINE_P3.txt | 15 ث | 14.20–28.85 (الأشطر 7–12) | 1080p |
| CINE_TAIL.txt | 4 ث | 28.85–29.57 (الخاتمة) | 1080p |

المجموع 34 ثانية توليد.

### CINE_P1
```
Photoreal live-action historical epic, shot on 35mm anamorphic with horizontal lens flares, vertical 9:16. Hard backlight and rim light, volumetric haze, god rays, floating dust, deep chiaroscuro, shallow depth of field, muted earth palette with one saturated deep-burgundy accent, fine film grain, 24fps motion blur. Slow precise camera moves; slow motion on symbolic moments, sudden speed ramps on impacts. Solemn, tragic, epic.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear, a thin burgundy thread tied around his right wrist in every shot. His face is NEVER visible: always from behind, as a black silhouette against bright light, in deep shadow, or only as hands, feet and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written. THE OTHER: only a plump hand heavy with gold rings and a red carnelian signet ring in a gold-embroidered silk sleeve, never a face.
Shot 1: Night, a barber-surgeon's stall lit by one trembling oil lamp. Macro on his hands in a cream cotton robe gripping the stool, the burgundy thread on his wrist; from the darkness the ringed hand offers a copper coin and his fist closes, refusing. On the wall the huge shadow of iron pincers closes and violently jerks back. The pincers' shadow spins and match-cuts into the black keyhole of a cell door.
Shot 2: A stone prison cell, blue moonlight through a high barred window. In a ragged grey-brown sackcloth tunic with iron shackles he sits with his back to camera; the ringed hand dangles the cell key outside the bars and he does not reach. The iron door slams shut in a sudden speed ramp, dust raining from the ceiling, cut to black, then a thin slit of light.
Shot 3: The slit becomes a narrow bright window in a bare room at dusk. In a white linen robe he kneels as a black silhouette; a white dove rises from his chest and flies out through the window in extreme slow motion, feathers floating in the light. Its white wing fills the frame and whips into a huge sinking sun.
Shot 4: A mud-brick rooftop at sunset over a city of domes, crane up from behind: in a sand-coloured robe and dark wool cloak he hauls on a rope tied toward the sun; the rope snaps in his hands, the sun sinks, the colour drains to grey and bleaches to white.
Exactly one man, fully clothed. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark anywhere.
```

### CINE_P2
```
Photoreal live-action historical epic, shot on 35mm anamorphic with horizontal lens flares, vertical 9:16. Hard backlight and rim light, volumetric haze, god rays, floating dust, deep chiaroscuro, shallow depth of field, muted earth palette with one saturated deep-burgundy accent, fine film grain, 24fps motion blur. Slow precise camera moves; slow motion on symbolic moments, sudden speed ramps on impacts. Solemn, tragic, epic.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear, a thin burgundy thread tied around his right wrist in every shot. His face is NEVER visible: always from behind, as a black silhouette against bright light, in deep shadow, or only as hands, feet and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written. THE OTHER: only a plump hand heavy with gold rings and a red carnelian signet ring in a gold-embroidered silk sleeve, never a face.
Shot 1: From white, a night blizzard. Medium from behind: in a bulky ochre sheepskin coat and grey wool head-wrap, snow crusting his shoulders, breath steaming, he walks past a warm glowing window where the ringed hand holds out a thick blanket; he does not stop and the warm light fades behind him. Rise through the falling snow to a top-down aerial of an endless white plain: small and alone he leads one balking camel with a shivering monkey on the saddle, long footprints trailing.
Shot 2: The footprints match-cut into the texture of a stretched hide. A muddy tannery under black clouds, steam rising from the vats: in a heavy leather apron he heaves a dripping hide onto a wooden frame in side silhouette; tilt up as black clouds close over the last sliver of sun like a door and the light dies to black.
Shot 3: In the black a spark ignites a small campfire in a rocky gorge under a huge moon, sparks flying. From behind at fire level, in an ochre dishdasha and fur vest: the ringed hand sets a rich silver platter of food on a rock beside him; he pushes it away with his foot and lowers a skewer with a bitter roasted desert lizard, shoulders heaving. Pull back and crane up: a colossal bear rises on its hind legs on the ridge, blotting out the moon, the camera shuddering; he grips a long spear.
Shot 4: Smash cut to a white-hot sun over a burnt barren field. In a straw-coloured farmer's tunic, low side angle, he casts his last grain in one wide arc frozen in bullet-time, the grains hanging in the air; they fall into cracked earth, macro, nothing grows, heat shimmer, a crack presses shut.
Exactly one man, fully clothed. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark anywhere.
```

### CINE_P3
```
Photoreal live-action historical epic, shot on 35mm anamorphic with horizontal lens flares, vertical 9:16. Hard backlight and rim light, volumetric haze, god rays, floating dust, deep chiaroscuro, shallow depth of field, muted earth palette with one saturated deep-burgundy accent, fine film grain, 24fps motion blur. Slow precise camera moves; slow motion on symbolic moments, sudden speed ramps on impacts. Solemn, tragic, epic; the pace slows from Shot 3.
THE MAN, the same in every shot: mid-twenties, athletic, broad shoulders, thick dark wavy-curly voluminous hair, short dark beard seen only as an edge along the jaw, thin round wire glasses whose temple arm glints behind his ear, a thin burgundy thread tied around his right wrist in every shot. His face is NEVER visible: always from behind, as a black silhouette against bright light, in deep shadow, or only as hands, feet and shadow. No frontal or three-quarter view, no eyes, no mouth. He never speaks. His clothes change completely in every shot exactly as written. THE OTHER: only a plump hand heavy with gold rings and a red carnelian signet ring in a gold-embroidered silk sleeve, never a face.
Shot 1: Red embers in a clay hearth; from behind at floor level, in a soot-stained grey tunic, he blows on them and thick smoke rolls back and fills the frame; it clears into a narrow souq alley at dusk where he walks bent, his dark cloak pulled over his head, as shadows of pointing hands grow on the walls and faceless out-of-focus passers-by turn their backs. At his carved house door, over the shoulder, in a faded brown merchant's bisht, he lays his iron key in the ringed hand, which snaps a copper coin into four and drops one quarter into his palm in slow motion. Then his bare feet step onto hot market stones and he trades his last worn boot for a loaf; on a long wall his shadow walks beside a companion's shadow, which crumbles into a gust of sand.
Shot 2: The sand becomes sea spray. A harbour at night in a storm, horizontal rain, sea-green light, a huge billowing sail. Low from behind: in a sea-green porter's vest he stands bent under a heavy coil of rope while a giant ship's hawser whips the sail again and again like a sea serpent, never touching him. Fast push-in on the rope as it snaps taut and white lightning fills the whole frame.
Shot 3: The white dissolves into a vast empty symmetrical stone courtyard at golden dawn, god rays and floating dust, a slow grand crane down between pillars on which small shadows of iron pincers, prison bars, a house and a walking companion slide past and fade. A towering dead-black arched door studded with brass, a brass ring knocker. In a clean white robe and one old black bisht with mended gold trim and a glowing burgundy lining he stands small, back to camera; the door's huge shadow creeps across the flagstones and swallows his shadow as his head sinks.
Shot 4: Macro side view at hand height: his hand rises toward the brass knocker and trembles a finger's width from it, the burgundy thread catching the light. A hatch snaps open and the ringed hand dangles a heavy pouch of gold. Rack focus from the gold to the burgundy thread; his hand lowers. Reverse angle from inside the dark doorway through the hatch: he walks away into the blazing rising sun, back to camera, his spine straightening with every step, his long shadow stretching back across the door. The pouch drops and gold coins scatter in the dust in slow motion; the hatch slams shut.
Exactly one man, fully clothed. No blood, no injury, no visible violence. No text, subtitles, letters, numbers, logos or watermark anywhere.
```

### CINE_TAIL
```
Photoreal live-action film, shot on 35mm, vertical 9:16, soft silver window light with a warm amber edge, fine film grain, a slow gentle push-in, quiet and dignified. It opens from a narrow arch-shaped slit of white light that widens into a tall bright window.
A present-day room: trailing pothos vines from a high shelf, a slatted wooden wall panel, an antique world map on the wall with no readable lettering. A man in his mid-twenties with broad shoulders, thick dark wavy-curly hair and thin round wire glasses stands before the window with his back to the camera, a black silhouette against the light, wearing a burgundy fine-knit turtleneck and black high-waisted pleated trousers, a thin burgundy thread tied around his right wrist. His bowed head slowly rises until he stands fully upright, chin level, and holds. His face is never visible; he never turns toward the camera. No text, letters, logos or watermark.
```

## 8. الانتقالات والمؤثرات في المونتاج (ffmpeg وRemotion)

**نفّذ هذه في كل الأحوال، حتى لو أخرج Kling بعضها بنفسه:**

| # | المؤثر | التنفيذ |
|---|---|---|
| 1 | قطع مطابق 1.00 (الضرس إلى القفل) | قناع دائري يدور وينكمش خلال 6 إطارات، مع ذوبان 4 إطارات |
| 2 | 1.98 صفقة الباب | تسريع 150% لآخر 6 إطارات، وارتجاج الصورة ±12px لمدة 4 إطارات، ثم أسود 3 إطارات، ثم شق ضوء ينفتح أفقياً حتى 2.35 |
| 3 | 3.65 مسح الجناح | ضبابية حركة اتجاهية 8 إطارات (`xfade=transition=wipeleft` مع `gblur`) |
| 4 | 4.48–4.90 | نزع اللون تدريجياً (`hue=s=0`)، ثم تبييض كامل 4 إطارات عند 4.90 |
| 5 | 9.01–9.30 | إطفاء السطوع حتى الأسود، ثم ولادة شرارة: لمعة برتقالية 3 إطارات عند 9.60 |
| 6 | 10.93 قيام الدب | ارتجاج ±16px لمدة 6 إطارات، وتسريع |
| 7 | 11.50 | قطع صادم إلى أبيض 2 إطار ثم الحقل |
| 8 | 12.04 | تجميد 8 إطارات للحَبّ المعلّق (إن لم يظهر من Kling) |
| 9 | 14.20 | قطع صادم بلمعة حمراء إطار واحد |
| 10 | 15.35 | مسح بالدخان: طبقة دخان شبه شفافة تعبر الصورة 10 إطارات (`xfade=transition=fadeblack` مخفّف) |
| 11 | 21.05 | مسح بالجزيئات (`xfade=transition=pixelize` أو `hblur`) 8 إطارات |
| 12 | **23.07** | **برق:** أبيض كامل 5 إطارات، ثم ذوبان من الأبيض حتى 23.35 |
| 13 | 28.54 | **قوس:** قناع قوس حدوة فرس أسود ينغلق خلال 3 إطارات، ويترك شق ضوء يتسع إلى الأبيض حتى 28.85، ثم تُفتح الخاتمة من الأبيض |
| 14 | التلوين العام | منحنى دافئ خفيف، والحفاظ على العنّابي، وتوحيد اللون بين الأجزاء الثلاثة |
| 15 | الملمس | حبيبات خفيفة `noise=alls=4:allf=t`، وتظليل حواف `vignette=PI/5.5`، ووهج خفيف على الإضاءات (`gblur` بمزج screen 10%) |
| 16 | حواف سينمائية | شريطان أسودان خفيفان أعلى وأسفل (letterbox) بارتفاع 60px لكل منهما، طوال الفيلم ما عدا الخاتمة. في الخاتمة ينفتح الشريطان تدريجياً خلال 0.4 ث، رمزاً للتحرر |

**مؤثرات صوتية اختيارية:**
- مستواها بين −28 و−18 dB، تحت صوت القصيدة.
- لا تغطي الكلام أبداً، واخفضها تلقائياً بمقدار 6 dB عند وجود الصوت البشري (ducking).

| الزمن (ث) | المؤثر |
|---|---|
| 0.93 | طقّة معدن |
| 1.98 | صفقة باب حديد مع صدى |
| 3.41 | رفرفة أجنحة |
| 4.48 | انقطاع حبل |
| 6.30 | ريح ثلج |
| 9.01 | رعد بعيد |
| 9.60 | اشتعال شرارة |
| 10.93 | زئير دب منخفض |
| 12.04 | نثر حَبّ |
| 13.86 | طقطقة طين |
| 15.35 | همهمات سوق |
| 18.45 | رنّة فلس |
| 20.0 | ريح رملية |
| 21.05–23.0 | عاصفة وشراع يخفق |
| **23.07** | **فرقعة حبل وبرق، أقوى نقطة (−14 dB)** |
| 26.9 | انفتاح كوّة خشب |
| 28.3 | رنين ذهب يتناثر |
| 28.54 | صفقة الكوّة |
| 28.85–29.57 | نفَس هادئ وريح خفيفة |

## 9. المونتاج

1. **الصوت:** استخرجه بدون تعديل من فيديو القصيدة الأصلي (`VID_20261027_165024_693.mp4`):
   `ffmpeg -i VID.mp4 -vn -c:a copy audio_master.m4a`
   مدته 29.57 ث، ويُوضع على 0.00. لا يُغيَّر.
2. **اكتشاف القطوع:** اكتشف القطوع داخل كل جزء بـ PySceneDetect أو بـ `select='gt(scene,0.3)'`.
3. **ضبط التوقيت:** غيّر سرعة كل لقطة بـ `setpts` بين 75% و125%، أو جمّد آخر إطاراتها بـ `tpad`، حتى تنتهي على حدّها:

| الجزء | يوضع عند | حدود اللقطات بزمن الجزء | بالزمن العام | يُقصّ عند |
|---|---|---|---|---|
| P1 | 0.00 | 1.00 / 2.35 / 3.65 | نفسها | 4.90 |
| P2 | 4.90 | 2.45 / 4.70 / 6.60 | 7.35 / 9.60 / 11.50 | 9.30 (14.20 عاماً) |
| P3 | 14.20 | 6.85 / 9.15 / 11.80 | 21.05 / 23.35 / 26.00 | 14.65 (28.85 عاماً) |
| TAIL | 28.85 | — | — | 0.72 |

   - **داخل لقطة P3 الأولى** (14.20–21.05) أحداث عدة؛ اقطعها على: 15.35 (الزقاق)، 16.50 (الباب)، 18.85 (الحذاء)، 19.95 (الجدار).
   - **إذا جاءت مدة جزء أقصر من حاجته:** وزّع لقطاته على حدودها بالإبطاء، ولا تتجاوز 75%، أو كرّر لحظة هادئة ثابتة.
   - **إذا بقي فراغ لا يُغطّى:**
     1. خذ وصف تلك اللقطة من جدول القسم 5.
     2. ضع قبله فقرتي الأسلوب والبطل من بداية أي كتلة.
     3. ولّدها وحدها بـ Kling 4.0، بمدة 3 إلى 5 ثوانٍ.

4. **الربط:** اربط الأجزاء بالانتقالات المذكورة في القسم 8.
5. **المواصفات النهائية:** 1080×1920، و24 إطاراً/ث، والمدة **29.57 ث** بالضبط.
6. **بدون أي نص على الفيديو.**
7. **التصدير:** `final_cinematic.mp4`، بترميز H.264 بمعدل 12–16 Mbps، وصوت AAC بمعدل 256k.

## 10. فحص الجودة

- [ ] **لا وجه ولا عين ولا فم في أي إطار.**
  - شغّل كشف الوجوه (MediaPipe أو OpenCV) على كل 3 إطارات، ثم راجع النتائج بعينك.
  - أي إطار فيه وجه: احذفه، أو جمّد الإطار السابق، أو قصّ الإطار.
- [ ] الخيط العنّابي ظاهر في أغلب المشاهد، والثياب تتغيّر حسب الجدول.
- [ ] يد اللئيم تظهر في عروض النجاة، وهو يرفضها في كل مرة.
- [ ] الانتقالات الثمانية عشر موجودة، والأحداث على وقتها: 1.98، 10.93، 18.45، 23.07، 28.54.
- [ ] لا دم، ولا عنف ظاهر، ولا أي نص أو كتابة على الفيديو.
- [ ] المدة 29.57 ث (±1 إطار)، والصوت الأصلي لم يُمسّ.

## 11. التسليم

- `final_cinematic.mp4`: صورة وصوت فقط، بلا أي نص.
- روابط الأجزاء الأصلية من Kling، ورقم كل طلب (`request_id`).
- `contact_sheet.png`: إطار من كل شطر، مع الزمن.
- `QA_REPORT.md`، ويحتوي:
  - ما تولّد وكم ثانية.
  - ما أُعيد ولماذا.
  - الإطارات المحذوفة.
  - السرعات المستعملة لكل لقطة.
  - أي مشكلة لم تُحل.
