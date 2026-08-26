/**
 * Editable site content.
 *
 * Everything the admin dashboard can change lives here as the default
 * seed. At runtime the app loads any saved overrides from localStorage,
 * so edits survive refreshes. Replace these defaults with real data or
 * wire `loadContent`/`saveContent` to a backend API later.
 */

export type Bi = { en: string; ar: string };

export type StatItem = { id: string; label: Bi; value: number; suffix: string };

export type ServiceItem = {
  id: string;
  name: Bi;
  blurb: Bi;
  price: Bi;
  accent: string;
  icon: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  url: string;
  image: string;
  client: Bi;
  industry: Bi;
  services: Bi;
  tech: string;
  budget: string;
  duration: Bi;
  result: Bi;
  quote: Bi;
  author: Bi;
  problem: Bi;
  solution: Bi;
  features: Bi;
  featured: boolean;
};

export type TierItem = { id: string; name: string; price: Bi; desc: Bi; highlight: boolean };

export type SiteContent = {
  hero: { title: Bi; sub: Bi };
  about: { title: Bi; copy: Bi };
  stats: StatItem[];
  services: ServiceItem[];
  projects: ProjectItem[];
  tiers: TierItem[];
  contact: {
    email: string;
    phone: string;
    hours: Bi;
    location: Bi;
    linkedin: string;
    instagram: string;
    behance: string;
  };
  pricing: {
    websiteTypes: Record<string, number>;
    pagePrice: number;
    features: Record<string, number>;
    designLevels: Record<string, number>;
  };
};

export const defaultContent: SiteContent = {
  hero: {
    title: {
      en: "We Build Digital Experiences That Grow Businesses.",
      ar: "نصنع تجارب رقمية تُنمّي الأعمال.",
    },
    sub: {
      en: "From high-converting websites to complete digital platforms and social media management, NEXORA turns ideas into scalable digital experiences.",
      ar: "من المواقع عالية التحويل إلى المنصات الرقمية المتكاملة وإدارة وسائل التواصل، تحوّل نكسورا الأفكار إلى تجارب رقمية قابلة للتوسع.",
    },
  },

  about: {
    title: { en: "Digital Experiences, Engineered to Grow.", ar: "تجارب رقمية مصممة للنمو." },
    copy: {
      en: "NEXORA serves small businesses that need affordable premium websites and organizations that require enterprise-grade digital platforms. The same principles guide both: clear strategy, sharp design, secure engineering and measurable business outcomes.",
      ar: "تخدم نكسورا الشركات الصغيرة التي تحتاج مواقع احترافية بأسعار مناسبة، والمؤسسات التي تحتاج منصات رقمية بمستوى المؤسسات. المبادئ نفسها تحكم الحالتين: استراتيجية واضحة، تصميم دقيق، هندسة آمنة، ونتائج أعمال قابلة للقياس.",
    },
  },

  stats: [
    { id: "s1", label: { en: "Websites Delivered", ar: "موقع تم تسليمه" }, value: 50, suffix: "+" },
    { id: "s2", label: { en: "Businesses Supported", ar: "شركة نخدمها" }, value: 25, suffix: "+" },
    { id: "s3", label: { en: "Digital Services", ar: "خدمة رقمية" }, value: 10, suffix: "+" },
    { id: "s4", label: { en: "Custom Solutions", ar: "حلول مخصصة" }, value: 100, suffix: "%" },
  ],

  services: [
    { id: "web", accent: "from-cyan-300 to-blue-500", icon: "</>", name: { en: "Website Development", ar: "تطوير المواقع" }, blurb: { en: "Custom websites engineered around each business model, brand and conversion path.", ar: "مواقع مخصصة مصممة حول نموذج عمل كل شركة وهويتها ومسار التحويل." }, price: { en: "Starting from EGP 5,000", ar: "تبدأ من ٥٬٠٠٠ ج.م" } },
    { id: "ecom", accent: "from-fuchsia-300 to-violet-500", icon: "bag", name: { en: "E-commerce Development", ar: "تطوير المتاجر الإلكترونية" }, blurb: { en: "Online stores with product management, payments, orders, customers and operations.", ar: "متاجر إلكترونية بإدارة المنتجات والمدفوعات والطلبات والعملاء والعمليات." }, price: { en: "Starting from EGP 25,000", ar: "تبدأ من ٢٥٬٠٠٠ ج.م" } },
    { id: "app", accent: "from-emerald-300 to-teal-500", icon: "app", name: { en: "Web Applications", ar: "تطبيقات الويب" }, blurb: { en: "Dashboards, booking systems, portals and complex business platforms built to scale.", ar: "لوحات تحكم وأنظمة حجز وبوابات ومنصات أعمال معقدة مبنية للتوسع." }, price: { en: "", ar: "" } },
    { id: "ux", accent: "from-amber-200 to-orange-500", icon: "ux", name: { en: "UI/UX Design", ar: "تصميم واجهات وتجربة المستخدم" }, blurb: { en: "Premium interfaces shaped around usability, storytelling and measurable conversion.", ar: "واجهات احترافية مبنية على سهولة الاستخدام والتحويل القابل للقياس." }, price: { en: "Starting from EGP 8,000", ar: "تبدأ من ٨٬٠٠٠ ج.م" } },
    { id: "soc", accent: "from-pink-300 to-rose-500", icon: "soc", name: { en: "Social Media Management", ar: "إدارة وسائل التواصل" }, blurb: { en: "Content strategy, production, posting, analytics and growth-focused account care.", ar: "استراتيجية محتوى وإنتاج ونشر وتحليلات وإدارة حسابات موجهة للنمو." }, price: { en: "From EGP 6,500/month", ar: "من ٦٬٥٠٠ ج.م شهرياً" } },
    { id: "brand", accent: "from-indigo-300 to-sky-500", icon: "id", name: { en: "Branding", ar: "الهوية البصرية" }, blurb: { en: "Identity systems including logo, typography, color, motion and practical guidelines.", ar: "أنظمة هوية شاملة تضم الشعار والخطوط والألوان والحركة والإرشادات." }, price: { en: "", ar: "" } },
    { id: "seo", accent: "from-lime-300 to-green-500", icon: "seo", name: { en: "SEO", ar: "تحسين محركات البحث" }, blurb: { en: "Technical and content optimization to improve search visibility and page quality.", ar: "تحسين تقني ومحتوى لرفع الظهور في البحث وجودة الصفحات." }, price: { en: "", ar: "" } },
    { id: "ai", accent: "from-violet-300 to-cyan-400", icon: "ai", name: { en: "AI Solutions", ar: "حلول الذكاء الاصطناعي" }, blurb: { en: "AI chatbots, automation workflows, AI support and intelligent business tools.", ar: "روبوتات محادثة وأتمتة ودعم ذكي وأدوات أعمال متقدمة." }, price: { en: "", ar: "" } },
  ],

  projects: [
    {
      id: "p1",
      name: "Utopia Designer",
      url: "https://utopiadesigner.vercel.app/",
      image: "https://images.pexels.com/photos/7130564/pexels-photo-7130564.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      featured: true,
      client: { en: "Utopia Design Studio", ar: "استوديو يوتوبيا للتصميم" },
      industry: { en: "Creative & Design", ar: "التصميم والإبداع" },
      services: { en: "UI/UX Design · Web Development · Branding", ar: "تصميم واجهات · تطوير ويب · هوية بصرية" },
      tech: "React, Next.js, Tailwind CSS, Framer Motion, Vercel",
      budget: "EGP 45,000 – 70,000",
      duration: { en: "6 weeks", ar: "٦ أسابيع" },
      result: { en: "Live production site with 98 Lighthouse performance score", ar: "موقع مباشر بدرجة أداء ٩٨ في Lighthouse" },
      quote: { en: "NEXORA delivered a site that finally matches the quality of the work we produce. Clients notice the difference immediately.", ar: "قدّمت نكسورا موقعاً يليق أخيراً بجودة الأعمال التي ننتجها. العملاء يلاحظون الفرق فوراً." },
      author: { en: "Creative Director, Utopia", ar: "المدير الإبداعي، يوتوبيا" },
      problem: { en: "A talented design studio was losing high-value leads because its old site loaded slowly, looked dated on mobile and buried the portfolio three clicks deep.", ar: "استوديو تصميم موهوب كان يخسر عملاء ذوي قيمة عالية بسبب موقع بطيء التحميل، شكله قديم على الجوال، ومعرض الأعمال مدفون خلف ثلاث نقرات." },
      solution: { en: "We rebuilt the studio's presence around the work itself: a fast Next.js front end, motion-led case study pages, and a portfolio that is visible from the first scroll on every device.", ar: "أعدنا بناء حضور الاستوديو حول الأعمال نفسها: واجهة Next.js سريعة، صفحات دراسات حالة تعتمد على الحركة، ومعرض أعمال ظاهر من أول تمرير على كل الأجهزة." },
      features: { en: "Animated case studies · Responsive gallery · Contact & brief form · SEO optimization · CMS-ready structure", ar: "دراسات حالة متحركة · معرض متجاوب · نموذج تواصل · تحسين محركات البحث · بنية جاهزة لنظام إدارة المحتوى" },
    },
    {
      id: "p2",
      name: "Zeitoun Kitchen",
      url: "",
      image: "https://images.pexels.com/photos/8856555/pexels-photo-8856555.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      featured: true,
      client: { en: "Zeitoun Kitchen, Zamalek", ar: "مطبخ زيتون، الزمالك" },
      industry: { en: "Restaurant & Hospitality", ar: "مطاعم وضيافة" },
      services: { en: "Website · Reservation System · Digital Menu · Social Media", ar: "موقع · نظام حجوزات · منيو رقمي · وسائل تواصل" },
      tech: "React, Node.js, PostgreSQL, Paymob, WhatsApp API",
      budget: "EGP 85,000 – 120,000",
      duration: { en: "8 weeks", ar: "٨ أسابيع" },
      result: { en: "+42% table reservations and 3,100 monthly digital menu views in the first quarter", ar: "زيادة ٤٢٪ في حجوزات الطاولات و٣٬١٠٠ مشاهدة شهرية للمنيو الرقمي في الربع الأول" },
      quote: { en: "Reservations used to live in a paper notebook. Now the floor manager opens one dashboard and the whole evening is planned.", ar: "كانت الحجوزات تُسجَّل في دفتر ورقي. الآن يفتح مدير الصالة لوحة واحدة وتُخطَّط الأمسية بالكامل." },
      author: { en: "Owner, Zeitoun Kitchen", ar: "صاحب مطبخ زيتون" },
      problem: { en: "The restaurant handled every booking by phone during service hours, double-booked tables on busy nights, and had no way to update the menu without reprinting it.", ar: "كان المطعم يتعامل مع كل حجز عبر الهاتف أثناء ساعات الخدمة، ويحجز الطاولة مرتين في الليالي المزدحمة، ولا توجد طريقة لتحديث المنيو دون إعادة طباعته." },
      solution: { en: "A bilingual site with real-time table availability, QR digital menu the kitchen updates itself, WhatsApp confirmations, and a deposit system through Paymob for large groups.", ar: "موقع ثنائي اللغة يعرض توفر الطاولات لحظياً، منيو رقمي بـ QR يحدّثه المطبخ بنفسه، تأكيدات عبر واتساب، ونظام عربون عبر Paymob للمجموعات الكبيرة." },
      features: { en: "Live table booking · QR digital menu · WhatsApp confirmations · Paymob deposits · Arabic/English · Admin dashboard", ar: "حجز طاولات مباشر · منيو رقمي QR · تأكيدات واتساب · عربون Paymob · عربي/إنجليزي · لوحة تحكم" },
    },
    {
      id: "p3",
      name: "Maison Attire",
      url: "",
      image: "https://images.pexels.com/photos/8311880/pexels-photo-8311880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      featured: true,
      client: { en: "Maison Attire, Cairo", ar: "ميزون أتاير، القاهرة" },
      industry: { en: "Fashion E-commerce", ar: "تجارة أزياء إلكترونية" },
      services: { en: "E-commerce · Branding · Payments · Inventory", ar: "متجر إلكتروني · هوية بصرية · مدفوعات · مخزون" },
      tech: "React, Laravel, MySQL, Paymob, Vodafone Cash",
      budget: "EGP 130,000 – 180,000",
      duration: { en: "11 weeks", ar: "١١ أسبوعاً" },
      result: { en: "EGP 1.4M in tracked online sales within 7 months of launch", ar: "١٫٤ مليون ج.م مبيعات إلكترونية مسجلة خلال ٧ أشهر من الإطلاق" },
      quote: { en: "We were selling through Instagram DMs. Now we have a real store, real stock control, and we finally know which products actually make money.", ar: "كنا نبيع عبر رسائل إنستجرام. الآن لدينا متجر حقيقي وتحكم فعلي في المخزون، وأخيراً نعرف أي المنتجات تحقق ربحاً." },
      author: { en: "Co-founder, Maison Attire", ar: "الشريك المؤسس، ميزون أتاير" },
      problem: { en: "A growing fashion label was processing orders manually through Instagram messages, losing track of stock across two branches and unable to accept card payments.", ar: "علامة أزياء متنامية كانت تعالج الطلبات يدوياً عبر رسائل إنستجرام، تفقد تتبع المخزون بين فرعين، وغير قادرة على قبول الدفع بالبطاقات." },
      solution: { en: "A full storefront with size and colour variants, branch-aware inventory, Paymob card checkout plus Vodafone Cash, automated order emails, and an admin panel the team runs without us.", ar: "متجر متكامل بمقاسات وألوان متعددة، مخزون مرتبط بالفروع، دفع بالبطاقة عبر Paymob بالإضافة إلى فودافون كاش، رسائل طلبات تلقائية، ولوحة إدارة يشغّلها الفريق بنفسه." },
      features: { en: "Product variants · Multi-branch inventory · Paymob & Vodafone Cash · Order management · Wishlist · Reviews · Arabic/English", ar: "منتجات متعددة الخيارات · مخزون متعدد الفروع · Paymob وفودافون كاش · إدارة الطلبات · قائمة الرغبات · تقييمات · عربي/إنجليزي" },
    },
    {
      id: "p4",
      name: "Karim Adel — Portfolio",
      url: "",
      image: "https://images.pexels.com/photos/16313659/pexels-photo-16313659.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      featured: true,
      client: { en: "Karim Adel, Photographer & Art Director", ar: "كريم عادل، مصور ومدير فني" },
      industry: { en: "Personal Portfolio", ar: "معرض أعمال شخصي" },
      services: { en: "UI/UX Design · Web Development · SEO", ar: "تصميم واجهات · تطوير ويب · تحسين محركات البحث" },
      tech: "React, TypeScript, Tailwind CSS, Cloudinary",
      budget: "EGP 18,000 – 28,000",
      duration: { en: "3 weeks", ar: "٣ أسابيع" },
      result: { en: "Booked 9 commercial shoots in the first two months from organic search", ar: "حجز ٩ جلسات تصوير تجارية خلال أول شهرين من البحث العضوي" },
      quote: { en: "Clients used to ask me to send work over WhatsApp. Now I send one link and the conversation starts at a completely different level.", ar: "كان العملاء يطلبون مني إرسال الأعمال عبر واتساب. الآن أرسل رابطاً واحداً ويبدأ الحوار من مستوى مختلف تماماً." },
      author: { en: "Karim Adel", ar: "كريم عادل" },
      problem: { en: "A working photographer had no central home for his portfolio, relied on social platforms that compressed his images, and had no way to be found by brands searching for a shooter in Cairo.", ar: "مصور محترف بلا موطن مركزي لأعماله، يعتمد على منصات تواصل تضغط صوره، وبلا وسيلة ليجده العملاء الباحثون عن مصور في القاهرة." },
      solution: { en: "A gallery-first portfolio with full-resolution lazy-loaded imagery, filterable project categories, an enquiry form that captures shoot details, and local SEO targeting Cairo commercial photography.", ar: "معرض أعمال يضع الصورة أولاً بدقة كاملة وتحميل كسول، تصنيفات قابلة للفلترة، نموذج استفسار يجمع تفاصيل الجلسة، وتحسين محركات بحث محلي يستهدف التصوير التجاري في القاهرة." },
      features: { en: "Full-resolution gallery · Category filters · Lazy loading · Enquiry form · Local SEO · Fast image CDN", ar: "معرض بدقة كاملة · فلاتر التصنيف · تحميل كسول · نموذج استفسار · تحسين محلي · شبكة توصيل صور سريعة" },
    },
  ],

  tiers: [
    { id: "t1", name: "STARTER", highlight: false, price: { en: "EGP 5,000", ar: "٥٬٠٠٠ ج.م" }, desc: { en: "For small businesses and simple websites.", ar: "للشركات الصغيرة والمواقع البسيطة." } },
    { id: "t2", name: "PROFESSIONAL", highlight: false, price: { en: "EGP 15,000", ar: "١٥٬٠٠٠ ج.م" }, desc: { en: "For businesses requiring advanced functionality.", ar: "للشركات التي تحتاج وظائف متقدمة." } },
    { id: "t3", name: "PREMIUM", highlight: true, price: { en: "EGP 50,000", ar: "٥٠٬٠٠٠ ج.م" }, desc: { en: "For advanced websites, e-commerce and custom systems.", ar: "للمواقع المتقدمة والمتاجر والأنظمة المخصصة." } },
    { id: "t4", name: "ENTERPRISE", highlight: false, price: { en: "Custom Pricing", ar: "سعر مخصص" }, desc: { en: "For large platforms and complex business systems.", ar: "للمنصات الكبيرة وأنظمة الأعمال المعقدة." } },
  ],

  contact: {
    email: "hello@nexora.digital",
    phone: "+20 100 000 0000",
    hours: { en: "Sun–Thu, 10:00–18:00", ar: "الأحد - الخميس، ١٠:٠٠ - ١٨:٠٠" },
    location: { en: "Cairo, Egypt", ar: "القاهرة، مصر" },
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
    behance: "https://behance.net",
  },

  pricing: {
    websiteTypes: { "Landing Page": 5000, "Business Website": 12000, Portfolio: 9000, "Restaurant Website": 14000, "Real Estate Website": 18000, "Booking Website": 24000, "E-commerce": 35000, Marketplace: 70000, "Learning Platform": 85000, "Web Application": 95000, "Custom Enterprise Platform": 180000 },
    pagePrice: 1200,
    features: { "Customer accounts": 9000, "Admin dashboard": 14000, "Online payments": 12000, "Vodafone Cash": 6500, Paymob: 8000, "Booking system": 15000, "Product management": 11000, "Order management": 12000, Notifications: 7000, "Email integration": 4500, "WhatsApp integration": 6000, "AI chatbot": 18000, "Search system": 9000, Reviews: 5000, Analytics: 6500, "Multi-language": 10000, "Multi-currency": 9000, "API integrations": 15000, "Custom database": 18000, "Advanced security": 16000, CMS: 10000, "SEO optimization": 7500 },
    designLevels: { Starter: 1, Professional: 1.35, Premium: 1.9, Enterprise: 2.8 },
  },
};

const STORAGE_KEY = "nexora_site_content";

/** Deep-merge saved overrides onto defaults so new fields keep working after updates. */
export function loadContent(): SiteContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultContent;
    const saved = JSON.parse(raw);
    return { ...defaultContent, ...saved };
  } catch {
    return defaultContent;
  }
}

export function saveContent(content: SiteContent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return true;
  } catch {
    return false;
  }
}

export function resetContent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function exportContent(content: SiteContent) {
  return JSON.stringify(content, null, 2);
}
