export interface PolicySection {
  heading: string
  heading_ar?: string
  body: string
  body_ar?: string
}

export interface PolicyPage {
  slug: string
  title: string
  title_ar?: string
  summary: string
  summary_ar?: string
  sections: PolicySection[]
}

export const policyPages: PolicyPage[] = [
  {
    slug: 'shipping',
    title: 'Shipping Policy',
    title_ar: 'سياسة الشحن',
    summary: 'Delivery methods, shipping quote validity, pickup, and handover expectations.',
    summary_ar: 'طرق التوصيل، صلاحية عروض الشحن، الاستلام من الفرع، ومتطلبات التسليم.',
    sections: [
      { heading: 'Shipping quotes', heading_ar: 'عروض الشحن', body: 'Shipping costs are calculated from the selected address, carrier destination, package weight, and package volume. Quotes may expire and can be recalculated before order placement.', body_ar: 'يتم احتساب تكلفة الشحن حسب العنوان المختار ووجهة شركة الشحن ووزن وحجم الشحنة. قد تنتهي صلاحية العرض ويتم إعادة احتسابه قبل تأكيد الطلب.' },
      { heading: 'Delivery timing', heading_ar: 'مدة التوصيل', body: 'Delivery timing depends on stock availability, dispatch readiness, carrier capacity, and destination coverage. Customers receive updates as the order moves through packing, dispatch, shipment, and delivery.', body_ar: 'تعتمد مدة التوصيل على توفر المخزون وجاهزية الإرسال وقدرة شركة الشحن وتغطية الوجهة. ستصلك تحديثات أثناء تجهيز الطلب وشحنه وتسليمه.' },
      { heading: 'Pickup orders', heading_ar: 'طلبات الاستلام', body: 'Pickup orders can be collected after the order is marked ready for collection. A customer or authorized representative may be asked to provide order details at handover.', body_ar: 'يمكن استلام الطلبات بعد وضع علامة جاهز للاستلام. قد يطلب من العميل أو الممثل المفوض تقديم تفاصيل الطلب عند التسليم.' },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns & Refunds Policy',
    title_ar: 'سياسة الإرجاع والاسترداد',
    summary: 'How return requests, partial refunds, restocking, and support tickets are handled.',
    summary_ar: 'آلية معالجة طلبات الإرجاع، الاسترداد الجزئي، إعادة التخزين، وتذاكر الدعم.',
    sections: [
      { heading: 'Starting a return', heading_ar: 'بدء طلب الإرجاع', body: 'Customers can open a return/refund request from the account requests area. Include the related order number, product, quantity, and reason.', body_ar: 'يمكن للعميل فتح طلب إرجاع أو استرداد من صفحة الطلبات والدعم في الحساب مع توضيح رقم الطلب والمنتج والكمية والسبب.' },
      { heading: 'Partial returns', heading_ar: 'الإرجاع الجزئي', body: 'Returns and refunds can be handled per order line. A refund may apply to selected products only and may be processed with or without physical return depending on the case.', body_ar: 'يمكن معالجة الإرجاع والاسترداد على مستوى كل صنف في الطلب. قد يتم الاسترداد لبعض المنتجات فقط، مع أو بدون إرجاع فعلي حسب الحالة.' },
      { heading: 'Inspection and approval', heading_ar: 'الفحص والموافقة', body: 'Returned products may require inspection before restocking or final approval. Refund values are recorded against the affected order items for accurate net sales reporting.', body_ar: 'قد تحتاج المنتجات المرتجعة إلى فحص قبل إعادة التخزين أو الموافقة النهائية. يتم تسجيل مبالغ الاسترداد على أصناف الطلب المتأثرة لدقة تقارير صافي المبيعات.' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    title_ar: 'سياسة الخصوصية',
    summary: 'How customer, account, order, notification, and support information is used.',
    summary_ar: 'كيفية استخدام بيانات العميل والحساب والطلبات والإشعارات والدعم.',
    sections: [
      { heading: 'Information collected', heading_ar: 'المعلومات التي يتم جمعها', body: 'We collect account, contact, address, order, loyalty, notification, and support information needed to operate the ecommerce service.', body_ar: 'نجمع معلومات الحساب والتواصل والعناوين والطلبات والولاء والإشعارات والدعم اللازمة لتشغيل خدمة التجارة الإلكترونية.' },
      { heading: 'Use of information', heading_ar: 'استخدام المعلومات', body: 'Information is used to authenticate customers, process orders, calculate delivery, manage support, send service notifications, and improve customer experience.', body_ar: 'تستخدم المعلومات للتحقق من العملاء ومعالجة الطلبات واحتساب التوصيل وإدارة الدعم وإرسال إشعارات الخدمة وتحسين تجربة العميل.' },
      { heading: 'Data protection', heading_ar: 'حماية البيانات', body: 'Access to customer records is limited to authorized operational users and systems that need the information to provide the service.', body_ar: 'يقتصر الوصول إلى سجلات العملاء على المستخدمين والأنظمة المصرح لها والتي تحتاج المعلومات لتقديم الخدمة.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    title_ar: 'شروط الاستخدام',
    summary: 'Customer account, order, catalog, pricing, and acceptable-use terms.',
    summary_ar: 'شروط الحساب والطلبات والكتالوج والأسعار والاستخدام المقبول.',
    sections: [
      { heading: 'Account use', heading_ar: 'استخدام الحساب', body: 'Customers are responsible for keeping account credentials secure and ensuring submitted contact, delivery, and payment details are accurate.', body_ar: 'يتحمل العملاء مسؤولية الحفاظ على بيانات الدخول والتأكد من صحة بيانات التواصل والتوصيل والدفع.' },
      { heading: 'Catalog and pricing', heading_ar: 'الكتالوج والأسعار', body: 'Product availability, prices, promotions, shipping quotes, and order acceptance can change before an order is confirmed.', body_ar: 'قد تتغير توفر المنتجات والأسعار والعروض وعروض الشحن وقبول الطلب قبل تأكيده.' },
      { heading: 'Order acceptance', heading_ar: 'قبول الطلب', body: 'Order submission records a request for fulfillment. Operational review may still be required for stock, delivery, or payment verification.', body_ar: 'إرسال الطلب يسجل طلباً للتنفيذ، وقد تتطلب العملية مراجعة توفر المخزون أو التوصيل أو الدفع.' },
    ],
  },
  {
    slug: 'warranty',
    title: 'Warranty Policy',
    title_ar: 'سياسة الضمان',
    summary: 'Warranty request expectations for industrial products and supplied goods.',
    summary_ar: 'متطلبات طلبات الضمان للمنتجات الصناعية والبضائع الموردة.',
    sections: [
      { heading: 'Coverage', heading_ar: 'التغطية', body: 'Warranty coverage depends on manufacturer terms, product category, correct use, and the condition of the returned item.', body_ar: 'تعتمد تغطية الضمان على شروط المصنع وفئة المنتج والاستخدام الصحيح وحالة المنتج المرتجع.' },
      { heading: 'Claims', heading_ar: 'المطالبات', body: 'Warranty claims should be opened from the support requests area with the order number, product details, issue description, and supporting photos where available.', body_ar: 'يجب فتح مطالبات الضمان من صفحة الطلبات والدعم مع رقم الطلب وتفاصيل المنتج ووصف المشكلة والصور الداعمة إن وجدت.' },
      { heading: 'Exclusions', heading_ar: 'الاستثناءات', body: 'Consumables, misuse, incorrect installation, abnormal operating conditions, and normal wear may be excluded from warranty coverage.', body_ar: 'قد تستثنى المواد الاستهلاكية وسوء الاستخدام والتركيب غير الصحيح وظروف التشغيل غير الطبيعية والتآكل الطبيعي من الضمان.' },
    ],
  },
  {
    slug: 'faq',
    title: 'FAQ',
    title_ar: 'الأسئلة الشائعة',
    summary: 'Common questions about orders, delivery, returns, warranty, and account notifications.',
    summary_ar: 'أسئلة شائعة عن الطلبات والتوصيل والإرجاع والضمان وإشعارات الحساب.',
    sections: [
      { heading: 'Where can I track my order?', heading_ar: 'أين أتابع طلبي؟', body: 'Order status and details are available from the account orders area. Important updates also appear in the notification center.', body_ar: 'يمكن متابعة حالة الطلب وتفاصيله من صفحة الطلبات في الحساب، كما تظهر التحديثات المهمة في مركز الإشعارات.' },
      { heading: 'How do I request a return or refund?', heading_ar: 'كيف أطلب إرجاعاً أو استرداداً؟', body: 'Open a return/refund request from the account requests area and include the related order and product details.', body_ar: 'افتح طلب إرجاع أو استرداد من صفحة الطلبات والدعم وأرفق تفاصيل الطلب والمنتج.' },
      { heading: 'How do back-in-stock alerts work?', heading_ar: 'كيف تعمل تنبيهات توفر المنتج؟', body: 'When an unavailable product becomes available again, customers who requested an alert receive a notification with a link back to the product page.', body_ar: 'عند توفر منتج غير متاح مرة أخرى، يتلقى العملاء الذين طلبوا التنبيه إشعاراً يتضمن رابط صفحة المنتج.' },
    ],
  },
]

export const findPolicyPage = (slug: string) => policyPages.find(page => page.slug === slug)
