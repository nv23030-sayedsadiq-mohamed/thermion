import type { Locale } from "@/lib/i18n/config";
import { platformDictionary } from "@/lib/i18n/platform";
const methodology = {
  en: [
    [
      "Data sources",
      "Thermion retrieves authentic CSV observations from NASA FIRMS. MODIS NRT and Standard Processing, and VIIRS Suomi-NPP, NOAA-20 and NOAA-21 NRT and Standard Processing are supported. Product-specific availability is checked before each live query. NRT products can be revised; Standard Processing products have different release delays.",
    ],
    [
      "MODIS overview",
      "MODIS active-fire observations use nominal 1 km pixels at nadir. The brightness field is a band 21/22 brightness temperature in kelvin. Confidence is a sensor-specific value from 0 to 100. Nominal/high filtering retains values ≥30; high filtering retains values ≥80. These cutoffs do not represent wildfire severity.",
    ],
    [
      "VIIRS overview",
      "VIIRS active-fire observations use nominal 375 m pixels at nadir. The displayed brightness is the I4 brightness temperature in kelvin; the original I5 value remains in source metadata when supplied. Confidence categories l, n and h mean low, nominal and high. They are not percentages or directly equivalent to MODIS confidence.",
    ],
    [
      "FIRMS API",
      "The server uses NASA’s Area CSV API with a private MAP_KEY, west,south,east,north bounds, and dated batches of one to five days. Dataset min_date and max_date are checked using the data availability endpoint. Availability is a product date range, not per-pixel overpass or clear-sky coverage. A request outside that range is unavailable, never a zero-detection day.",
    ],
    [
      "Data processing pipeline",
      "CSV is parsed server-side with quoted-field support. Coordinates, acquisition dates and UTC times are validated. Invalid records fail the query instead of silently producing a complete-looking result. Original measurements and metadata are retained. FRP is reported in megawatts when provided; absent values remain absent.",
    ],
    [
      "Spatial aggregation",
      "The geographic grid is anchored at longitude −180°, latitude −90°. Cell indices are floor((longitude + 180) / size) and floor((latitude + 90) / size). Supported sizes are 0.1°, 0.25°, 0.5° and 1°. Cells have unequal physical areas at different latitudes. Cell counts describe occupied cells, not burned area, equal-area statistics or unique fires. A grid marker represents a cell center; its inspection panel shows one representative record.",
    ],
    [
      "Temporal aggregation",
      "Daily boundaries use UTC midnight. Weeks begin Monday at 00:00 UTC; months and years use the Gregorian calendar. A complete aggregate requires a successful product query for every selected source and day in the requested period. Partial months and years cover only selected dates. Missing or unavailable source-days make the comparable count null; available partial observations remain separately reported.",
    ],
    [
      "Duplicate handling",
      "A stable SHA-256 fingerprint includes the source and sorted original record fields. Only identical source records are removed. Distinct platforms, processing sources, overlapping pixels and repeated overpasses remain separate observations. NRT and SP can overlap: choose one processing product per platform for counts intended to avoid that overlap. No proximity grouping is presented as a confirmed fire incident.",
    ],
    [
      "Sensor comparison limitations",
      "Raw counts, common-grid occupied-cell counts, UTC time series and queried source-days are shown separately. Spatial and temporal standardization does not equalize sensitivity, view angle, cloud obscuration or overpass frequency. No universal MODIS-to-VIIRS multiplier is applied. Coverage-aware correction is unavailable because the detection feed does not supply the observation denominator required for it.",
    ],
    [
      "Historical baselines",
      "The calendar reads actual ingested regional/source/year snapshots; it never downloads a global archive on load. A resumable worker persists five-day batches atomically. Days without successful ingestion remain missing. A multi-year query can compare full months of its latest year with the same month in at least two prior years, requiring complete product queries for the same sources. The baseline is the mean raw count; absolute and percentage departures are descriptive, with percentage omitted for a zero mean. Cloud and overpass coverage remain uncontrolled; no sensor-corrected anomaly or statistical significance is claimed.",
    ],
    [
      "Freshness and availability",
      "Live upstream results are cached in each server process for five minutes with request deduplication. Exports record retrieval time, selection and method. Historical snapshots keep their ingestion timestamp and are refreshed by rerunning the worker; successful batches are skipped, so remove or regenerate a snapshot deliberately when a source revision is required. In-process request budgets are not a distributed rate limiter.",
    ],
    [
      "Interpretation and limitations",
      "A thermal hotspot is not necessarily a wildfire. Industrial heat sources, agricultural burning and other thermal activity may appear. Fires can be missed because of timing, clouds, smoke or detection thresholds. Counts are influenced by source coverage and sensor characteristics. This platform supports research and situational awareness; it is not an authoritative emergency warning service.",
    ],
  ],
  ar: [
    [
      "مصادر البيانات",
      "يجلب ثيرميون رصد CSV الأصلي من NASA FIRMS. يدعم MODIS بالمعالجة شبه الآنية والمعيارية، وVIIRS على Suomi-NPP وNOAA-20 وNOAA-21 بنوعي المعالجة. يُتحقق من توافر كل منتج قبل الاستعلام المباشر. قد تُراجع المنتجات شبه الآنية، وتختلف مهلة نشر المنتجات المعيارية.",
    ],
    [
      "نظرة عامة على MODIS",
      "يستخدم رصد الحرائق النشطة بكسلات اسمية بحجم 1 كم عند سمت القمر. حقل السطوع هو درجة حرارة الحزمتين 21/22 بالكلفن. الثقة قيمة خاصة بالمستشعر من 0 إلى 100. يحتفظ مرشح الاسمي والمرتفع بقيم ≥30، والمرتفع بقيم ≥80. هذه الحدود ليست تصنيفًا لشدة الحريق.",
    ],
    [
      "نظرة عامة على VIIRS",
      "يستخدم رصد الحرائق النشطة بكسلات اسمية بحجم 375 مترًا عند سمت القمر. السطوع المعروض هو درجة حرارة I4 بالكلفن؛ تُحفظ قيمة I5 الأصلية عند توفيرها. فئات الثقة l وn وh تعني منخفضة واسمية ومرتفعة، وليست نسبًا مئوية ولا تكافئ ثقة MODIS مباشرة.",
    ],
    [
      "واجهة FIRMS",
      "يستخدم الخادم واجهة Area CSV ومفتاح MAP_KEY خاصًا وحدود غرب، جنوب، شرق، شمال ودفعات من يوم إلى خمسة أيام. يُفحص min_date وmax_date لكل منتج. التوافر نطاق زمني للمنتج وليس دليلًا على مرور القمر أو غياب السحب في كل بكسل. الفترة خارج النطاق غير متاحة وليست انعدام رصد.",
    ],
    [
      "مسار معالجة البيانات",
      "يُحلل CSV على الخادم مع دعم الحقول المقتبسة. يُتحقق من الإحداثيات والتواريخ وأوقات UTC. يؤدي السجل غير الصحيح إلى فشل الاستعلام بدل عرض نتيجة تبدو مكتملة. تُحفظ القياسات الأصلية وبيانات المصدر. تُعرض FRP بالميغاواط عند توفيرها؛ تبقى القيم الغائبة غائبة.",
    ],
    [
      "التجميع المكاني",
      "مرجع الشبكة هو خط الطول −180° وخط العرض −90°. تُحسب الخلية بالجزء الصحيح السفلي من (خط الطول + 180) / الحجم و(خط العرض + 90) / الحجم. الأحجام 0.1° و0.25° و0.5° و1°. تختلف المساحة الفعلية مع خط العرض. لا تعبر الخلايا المشغولة عن المساحة المحترقة أو عدد حرائق مستقلة. تمثل نقطة الشبكة مركز الخلية وتعرض لوحة الفحص سجلًا ممثلًا واحدًا.",
    ],
    [
      "التجميع الزمني",
      "تبدأ الأيام منتصف الليل UTC والأسابيع يوم الاثنين؛ تتبع الأشهر والسنوات التقويم الميلادي. يلزم لتمام التجميع نجاح الاستعلام لكل مصدر ويوم محدد. تغطي الأشهر والسنوات الجزئية الفترة المختارة فقط. يؤدي فقدان أيام مصادر إلى قيمة فارغة للعدد القابل للمقارنة؛ يُبلغ عن الرصد الجزئي المتاح بشكل منفصل.",
    ],
    [
      "معالجة التكرار",
      "تضم بصمة SHA-256 المصدر وجميع حقول السجل الأصلية المرتبة. يُزال التطابق الكامل فقط. تبقى الأقمار والمصادر والبكسلات المتداخلة ومرات المرور المختلفة رصدًا منفصلًا. قد تتداخل NRT وSP؛ اختر نوع معالجة واحدًا لكل منصة لتجنب هذا التداخل. لا يُعد التقارب المكاني إثباتًا لحادث حريق واحد.",
    ],
    [
      "قيود مقارنة المستشعرات",
      "تُعرض الأعداد الخام والخلايا المشغولة والسلاسل الزمنية UTC وأيام المصادر المستعلم عنها منفصلة. لا يوحد التجميع الحساسية أو زاوية الرؤية أو السحب أو تكرار المرور. لا يُطبق معامل تحويل عام بين MODIS وVIIRS. لا يتوفر تصحيح بحسب التغطية لغياب معلومات الرصد الكلي اللازمة.",
    ],
    [
      "خطوط الأساس التاريخية",
      "يقرأ التقويم أرشيفًا حقيقيًا بحسب المنطقة والمصدر والسنة ولا ينزل أرشيفًا عالميًا عند التحميل. يحفظ عامل قابل للاستئناف دفعات خمسة أيام بصورة ذرية. تبقى الأيام غير المستوردة مفقودة. يمكن مقارنة الأشهر الكاملة من أحدث سنة بمتوسط الشهر نفسه من سنتين سابقتين على الأقل، بشرط اكتمال استعلامات المصادر نفسها. يعرض الفرق المطلق والنسبة وصفيًا، وتُحذف النسبة عند متوسط صفر. لا تُضبط السحب ومرات المرور ولا تُدّعى دلالة إحصائية أو تصحيح حساسية.",
    ],
    [
      "حداثة البيانات وتوافرها",
      "تُخزن الاستجابات المباشرة مؤقتًا لخمس دقائق داخل عملية الخادم مع دمج الطلبات المتطابقة. يسجل التصدير وقت الجلب والاختيار والمنهج. تحفظ اللقطات وقت الاستيراد. يتخطى العامل الدفعات الناجحة؛ لإعادة جلب إصدار مصدر مُراجع يجب إعادة توليد اللقطة عمدًا. حد الطلبات داخل العملية ليس محدد معدل موزعًا.",
    ],
    [
      "التفسير والقيود",
      "ليست كل نقطة حرارية حريق غابات؛ قد تشمل حرارة صناعية أو حرقًا زراعيًا. قد تفوت الحرائق بسبب التوقيت والسحب والدخان وحدود الحساسية. تتأثر الأعداد بالتغطية وخصائص المستشعر. المنصة للبحث والوعي بالوضع وليست خدمة إنذار طوارئ رسمية.",
    ],
  ],
};
export function Documentation({
  locale,
  page,
}: {
  locale: Locale;
  page: "methodology" | "about";
}) {
  const t = platformDictionary(locale);
  if (page === "methodology")
    return (
      <article className="documentation">
        <div className="pipeline" aria-label={t.method}>
          {t.pipeline}
        </div>
        {methodology[locale].map(([heading, body], i) => (
          <section key={heading}>
            <h2>
              <span className="text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>{" "}
              {heading}
            </h2>
            <p>{body}</p>
          </section>
        ))}
        <section>
          <h2>{locale === "ar" ? "المراجع الرسمية" : "Official references"}</h2>
          <ul>
            <li>
              <a href="https://www.earthdata.nasa.gov/data/tools/firms">
                NASA Earthdata · FIRMS
              </a>
            </li>
            <li>
              <a href="https://firms.modaps.eosdis.nasa.gov/api/area">
                NASA Area API
              </a>
            </li>
            <li>
              <a href="https://firms.modaps.eosdis.nasa.gov/api/data_availability/">
                NASA Data Availability API
              </a>
            </li>
            <li>
              <a href="https://www.earthdata.nasa.gov/data/tools/firms/faq">
                NASA FIRMS FAQ
              </a>
            </li>
          </ul>
        </section>
      </article>
    );
  return (
    <article className="documentation">
      <section>
        <p className="eyebrow">NASA Space Apps Challenge 2026</p>
        <h2>THERMION</h2>
        <p>
          {locale === "ar"
            ? "ثيرميون منصة استخبارات حرائق عبر الأقمار الصناعية تهدف إلى جعل بيانات رصد الأرض من NASA أكثر إتاحة وقابلية للمقارنة وفهمًا. من خلال دمج رصد MODIS وVIIRS، تساعد المستخدمين على استكشاف النشاط التاريخي وتحديد الأنماط عبر المناطق الجغرافية."
            : "Thermion is a satellite fire intelligence platform designed to make NASA Earth observation data more accessible, comparable and meaningful. By integrating MODIS and VIIRS fire detections, Thermion helps users explore historical fire activity and identify patterns across geographic regions."}
        </p>
      </section>
      <section>
        <h2>{locale === "ar" ? "هدف التحدي" : "Challenge objective"}</h2>
        <p>Harmonization of MODIS and VIIRS Hot Spots</p>
        <p>
          {locale === "ar"
            ? "نهجنا: مخطط بيانات موحد وتجميع مكاني وزمني شفاف وتقويم تاريخي يحافظ على الفرق بين البيانات المفقودة وانعدام الرصد."
            : "Our approach: a common schema, transparent spatial and temporal aggregation, and historical calendars that preserve the distinction between missing data and zero observations."}
        </p>
      </section>
      <section>
        <h2>{locale === "ar" ? "التقنيات" : "Technology stack"}</h2>
        <p dir="ltr">
          Next.js · React · TypeScript · Tailwind CSS · MapLibre GL JS ·
          Recharts · Zod · date-fns
        </p>
      </section>
      <section>
        <h2>{locale === "ar" ? "الفريق" : "Team"}</h2>
        <p>{t.team}</p>
      </section>
      <section>
        <h2>{locale === "ar" ? "نسبة البيانات" : "Data attribution"}</h2>
        <p>{t.attribution}</p>
        <a href="https://www.earthdata.nasa.gov/data/tools/firms">
          NASA Earthdata / FIRMS ↗
        </a>
      </section>
    </article>
  );
}
