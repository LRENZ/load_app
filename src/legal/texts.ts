import type { Language } from '../i18n/index.ts';

/**
 * Bundled Privacy Policy and Terms of Use, per app language. Public English copies live in
 * docs/legal/ (used as the Google Play privacy-policy URL). Keep both in sync when data practices
 * change. The translations should be reviewed by a fluent speaker before wide release.
 */
export const LEGAL_EFFECTIVE_DATE = '2026-11-11';

type Doc = { privacy: string; terms: string };

const en: Doc = {
  privacy: `Repayly Privacy Policy
Effective date: 11 November 2026

Repayly ("the app") is a loan and EMI calculator. This policy explains what information the app handles.

1. Information that stays on your device
• The amounts, rates, terms and dates you enter, your results and your calculation history.
• Your language, currency and notification settings, and any rating you give in the app.
This information is stored only on your device and is never sent to us. You can delete it by clearing the app's data or uninstalling the app. If Android backup is turned on, Android may include it in your own device backup.

2. Information collected automatically
The app uses Google Firebase services, provided by Google:
• Google Analytics for Firebase: how the app is used (for example screens viewed, whether a calculation succeeded, the loan type and currency chosen) and device and app information such as device model, Android version, app version, language, an app-instance identifier and approximate location (country or region, derived by Google from your IP address). The amounts, rates and terms you enter are never sent.
• Firebase Crashlytics: crash reports and diagnostic information (device model, Android version, app state at the time of a crash) so that problems can be fixed.
• Firebase Cloud Messaging: a device token that lets the app receive notifications.
• Firebase Remote Config: the app downloads configuration settings; Firebase receives an app-instance identifier to deliver them.
• Google Play install referrer: when the app is installed from Google Play, it reads the install referrer (for example whether the install came from an ad campaign) and records only an "organic" or "paid" category and the campaign source.
The app does not collect the Android advertising ID. The information is used to keep the app working, fix crashes and understand which features are used. It is not sold. Google processes it under its own terms: firebase.google.com/support/privacy and policies.google.com/privacy.

3. Exchange rates
The exchange-rate tool requests rates from a public service (api.frankfurter.dev). The request contains only the two currency codes; like any web request, the service can see your IP address.

4. Notifications
If you allow notifications, the app can show the latest exchange rate in a notification. You can turn this off in the app or in Android settings.

5. Retention
Google Analytics keeps user-level data for the period set in the Firebase project (2 or 14 months). Crashlytics keeps crash stack traces for 90 days.

6. Children
The app is not directed to children under 13 and does not knowingly collect information from them.

7. Your choices
Uninstalling the app stops all collection. You can turn notifications off at any time. To ask a question or request deletion of data linked to your app-instance identifier, contact us at the developer email shown on Repayly's Google Play page.

8. Changes
This policy may be updated. The current version is always available in the app (Settings → Privacy Policy).

9. Contact
Use the developer contact email shown on Repayly's Google Play page.`,
  terms: `Repayly Terms of Use
Effective date: 11 November 2026

1. Estimates only. Repayly is a calculator. Its results are estimates for planning. They are not financial, legal or tax advice, and they are not an offer, quote or approval of credit. Repayly does not lend money or arrange loans.

2. Check with your lender. Real payments can differ because of fees, insurance, rounding, payment dates and the lender's own method. Confirm figures with your lender before you decide.

3. Exchange rates come from a public reference service, may be delayed and are for information only.

4. No warranty. The app is provided "as is". To the extent the law allows, we are not liable for decisions made using its results or for losses arising from using the app.

5. Use. You may use the app for personal purposes. Do not misuse it, reverse engineer it or use it unlawfully.

6. Third-party services such as Google Play and Firebase have their own terms.

7. These terms may be updated. Continuing to use the app means you accept the updated terms.

8. Contact: the developer email shown on Repayly's Google Play page.`,
};

const es: Doc = {
  privacy: `Política de privacidad de Repayly
Fecha de entrada en vigor: 11 de noviembre de 2026

Repayly ("la app") es una calculadora de préstamos y cuotas (EMI). Esta política explica qué información trata la app.

1. Información que se queda en tu dispositivo
• Los importes, tipos, plazos y fechas que introduces, tus resultados y tu historial de cálculos.
• Tu idioma, moneda y ajustes de notificaciones, y la valoración que des en la app.
Esta información se guarda solo en tu dispositivo y nunca se nos envía. Puedes borrarla eliminando los datos de la app o desinstalándola. Si la copia de seguridad de Android está activada, Android puede incluirla en la copia de seguridad de tu propio dispositivo.

2. Información recopilada automáticamente
La app usa servicios de Google Firebase, prestados por Google:
• Google Analytics para Firebase: cómo se usa la app (por ejemplo, pantallas vistas, si un cálculo tuvo éxito, el tipo de préstamo y la moneda elegidos) e información del dispositivo y de la app, como el modelo, la versión de Android, la versión de la app, el idioma, un identificador de instancia de la app y la ubicación aproximada (país o región, que Google deduce de tu dirección IP). Los importes, tipos y plazos que introduces nunca se envían.
• Firebase Crashlytics: informes de fallos e información de diagnóstico (modelo del dispositivo, versión de Android, estado de la app en el momento del fallo) para poder corregir problemas.
• Firebase Cloud Messaging: un token del dispositivo que permite a la app recibir notificaciones.
• Firebase Remote Config: la app descarga ajustes de configuración; Firebase recibe un identificador de instancia de la app para entregarlos.
• Referencia de instalación de Google Play: cuando la app se instala desde Google Play, lee la referencia de instalación (por ejemplo, si la instalación vino de una campaña publicitaria) y solo registra la categoría "orgánica" o "de pago" y el origen de la campaña.
La app no recopila el ID de publicidad de Android. La información se usa para que la app funcione, corregir fallos y entender qué funciones se usan. No se vende. Google la trata según sus propias condiciones: firebase.google.com/support/privacy y policies.google.com/privacy.

3. Tipos de cambio
La herramienta de tipos de cambio solicita los tipos a un servicio público (api.frankfurter.dev). La solicitud contiene solo los dos códigos de moneda; como cualquier solicitud web, el servicio puede ver tu dirección IP.

4. Notificaciones
Si permites las notificaciones, la app puede mostrar el último tipo de cambio en una notificación. Puedes desactivarlo en la app o en los ajustes de Android.

5. Conservación
Google Analytics conserva los datos a nivel de usuario durante el periodo configurado en el proyecto de Firebase (2 o 14 meses). Crashlytics conserva las trazas de los fallos durante 90 días.

6. Menores
La app no está dirigida a menores de 13 años y no recopila conscientemente información de ellos.

7. Tus opciones
Desinstalar la app detiene toda la recopilación. Puedes desactivar las notificaciones en cualquier momento. Para hacer una consulta o pedir la eliminación de los datos vinculados a tu identificador de instancia de la app, escríbenos al correo del desarrollador que aparece en la página de Repayly en Google Play.

8. Cambios
Esta política puede actualizarse. La versión vigente está siempre disponible en la app (Ajustes → Política de privacidad).

9. Contacto
Usa el correo de contacto del desarrollador que aparece en la página de Repayly en Google Play.`,
  terms: `Condiciones de uso de Repayly
Fecha de entrada en vigor: 11 de noviembre de 2026

1. Solo estimaciones. Repayly es una calculadora. Sus resultados son estimaciones para planificar. No son asesoramiento financiero, legal ni fiscal, ni una oferta, cotización o aprobación de crédito. Repayly no presta dinero ni gestiona préstamos.

2. Consulta a tu prestamista. Los pagos reales pueden variar por comisiones, seguros, redondeos, fechas de pago y el método del prestamista. Confirma las cifras con tu prestamista antes de decidir.

3. Los tipos de cambio proceden de un servicio público de referencia, pueden tener retraso y son solo informativos.

4. Sin garantía. La app se ofrece "tal cual". En la medida en que la ley lo permita, no somos responsables de las decisiones tomadas con sus resultados ni de las pérdidas derivadas de su uso.

5. Uso. Puedes usar la app para fines personales. No hagas un uso indebido, no la descompiles ni la uses de forma ilícita.

6. Los servicios de terceros, como Google Play y Firebase, tienen sus propias condiciones.

7. Estas condiciones pueden actualizarse. Seguir usando la app implica aceptar las condiciones actualizadas.

8. Contacto: el correo del desarrollador que aparece en la página de Repayly en Google Play.`,
};

const zh: Doc = {
  privacy: `Repayly 隐私政策
生效日期：2026 年 11 月 11 日

Repayly（"本应用"）是一款贷款和月供（EMI）计算器。本政策说明本应用如何处理信息。

1. 只保存在你设备上的信息
• 你输入的金额、利率、期限和日期，计算结果及计算历史。
• 你的语言、货币和通知设置，以及你在应用内给出的评分。
这些信息只保存在你的设备上，绝不会发送给我们。你可以清除应用数据或卸载应用来删除它们。如果你开启了 Android 备份，Android 可能会把它们包含在你自己的设备备份中。

2. 自动收集的信息
本应用使用 Google 提供的 Firebase 服务：
• Google Analytics for Firebase：应用的使用情况（例如浏览的页面、计算是否成功、所选贷款类型和货币），以及设备和应用信息，例如设备型号、Android 版本、应用版本、语言、应用实例标识符和大致位置（由 Google 根据你的 IP 地址推断的国家或地区）。你输入的金额、利率和期限绝不会被发送。
• Firebase Crashlytics：崩溃报告和诊断信息（设备型号、Android 版本、崩溃时的应用状态），用于修复问题。
• Firebase Cloud Messaging：让应用能够接收通知的设备令牌。
• Firebase Remote Config：应用下载配置；Firebase 会收到应用实例标识符以便下发配置。
• Google Play 安装引荐来源：从 Google Play 安装时，应用会读取安装引荐信息（例如安装是否来自广告活动），只记录"自然"或"付费"类别以及活动来源。
本应用不收集 Android 广告 ID。这些信息用于保证应用正常运行、修复崩溃和了解功能使用情况，不会出售。Google 按其自身条款处理这些信息：firebase.google.com/support/privacy 和 policies.google.com/privacy。

3. 汇率
汇率工具会向公共服务（api.frankfurter.dev）请求汇率。请求中只包含两个货币代码；和任何网络请求一样，该服务可以看到你的 IP 地址。

4. 通知
如果你允许通知，本应用可以在通知中显示最新汇率。你可以在应用内或 Android 设置中关闭。

5. 保留期限
Google Analytics 按 Firebase 项目中的设置保留用户级数据（2 个月或 14 个月）。Crashlytics 保留崩溃堆栈信息 90 天。

6. 儿童
本应用不面向 13 岁以下儿童，也不会有意收集他们的信息。

7. 你的选择
卸载应用即可停止所有收集。你可以随时关闭通知。如需咨询或要求删除与你的应用实例标识符相关的数据，请通过 Repayly 在 Google Play 页面上显示的开发者邮箱联系我们。

8. 变更
本政策可能会更新。最新版本始终可在应用内查看（设置 → 隐私政策）。

9. 联系方式
请使用 Repayly 在 Google Play 页面上显示的开发者联系邮箱。`,
  terms: `Repayly 使用条款
生效日期：2026 年 11 月 11 日

1. 仅供估算。Repayly 是一款计算器，其结果仅为用于规划的估算，不构成财务、法律或税务建议，也不是任何信贷的要约、报价或批准。Repayly 不放贷，也不撮合贷款。

2. 请与贷款机构确认。实际还款可能因手续费、保险、取整、还款日期和贷款机构的计算方法而不同。做决定前请与贷款机构确认金额。

3. 汇率来自公共参考服务，可能有延迟，仅供参考。

4. 不作保证。本应用按"现状"提供。在法律允许的范围内，我们不对依据计算结果作出的决定或因使用本应用产生的损失负责。

5. 使用。你可以出于个人目的使用本应用。请勿滥用、反向工程或以违法方式使用本应用。

6. Google Play、Firebase 等第三方服务有其各自的条款。

7. 本条款可能会更新。继续使用本应用即表示你接受更新后的条款。

8. 联系方式：Repayly 在 Google Play 页面上显示的开发者邮箱。`,
};

const ja: Doc = {
  privacy: `Repayly プライバシーポリシー
施行日：2026 年 11 月 11 日

Repayly（「本アプリ」）はローンと毎月返済額（EMI）の計算アプリです。本ポリシーでは、本アプリが扱う情報について説明します。

1. 端末内にのみ保存される情報
• 入力した金額・金利・期間・日付、計算結果、計算履歴。
• 言語・通貨・通知の設定、アプリ内で付けた評価。
これらの情報は端末内にのみ保存され、当方に送信されることはありません。アプリのデータを消去するか、アンインストールすると削除できます。Android のバックアップを有効にしている場合、Android がご自身の端末バックアップに含めることがあります。

2. 自動的に収集される情報
本アプリは Google が提供する Firebase サービスを利用しています。
• Google Analytics for Firebase：アプリの利用状況（表示した画面、計算が成功したかどうか、選択したローンの種類と通貨など）と、端末・アプリの情報（端末モデル、Android のバージョン、アプリのバージョン、言語、アプリインスタンス ID、IP アドレスから Google が推定するおおよその地域（国・地域））。入力した金額・金利・期間が送信されることはありません。
• Firebase Crashlytics：不具合を修正するためのクラッシュレポートと診断情報（端末モデル、Android のバージョン、クラッシュ時のアプリの状態）。
• Firebase Cloud Messaging：通知を受け取るための端末トークン。
• Firebase Remote Config：本アプリは設定をダウンロードします。配信のため Firebase はアプリインスタンス ID を受け取ります。
• Google Play インストールリファラー：Google Play からインストールされた場合、インストールリファラー（広告キャンペーン経由かどうかなど）を読み取り、「オーガニック」または「有料」の区分とキャンペーンの参照元のみを記録します。
本アプリは Android の広告 ID を収集しません。これらの情報は、アプリの動作維持、クラッシュの修正、機能の利用状況の把握に使用し、販売することはありません。Google は独自の規約に基づいて情報を処理します：firebase.google.com/support/privacy、policies.google.com/privacy。

3. 為替レート
為替ツールは公開サービス（api.frankfurter.dev）にレートを要求します。要求に含まれるのは 2 つの通貨コードのみです。一般的な Web 通信と同様、サービス側からは IP アドレスが見えます。

4. 通知
通知を許可すると、最新の為替レートを通知で表示できます。アプリ内または Android の設定でオフにできます。

5. 保存期間
Google Analytics は Firebase プロジェクトの設定期間（2 か月または 14 か月）ユーザー単位のデータを保持します。Crashlytics はクラッシュのスタックトレースを 90 日間保持します。

6. 子ども
本アプリは 13 歳未満の子どもを対象としておらず、子どもの情報を意図的に収集することはありません。

7. お客様の選択
アプリをアンインストールするとすべての収集が止まります。通知はいつでもオフにできます。お問い合わせや、アプリインスタンス ID に関連するデータの削除のご依頼は、Google Play の Repayly のページに表示されているデベロッパーのメールアドレスまでご連絡ください。

8. 変更
本ポリシーは更新されることがあります。最新版はいつでもアプリ内（設定 → プライバシーポリシー）で確認できます。

9. お問い合わせ
Google Play の Repayly のページに表示されているデベロッパーの連絡先メールアドレスをご利用ください。`,
  terms: `Repayly 利用規約
施行日：2026 年 11 月 11 日

1. 試算のみ。Repayly は計算アプリです。結果は計画のための試算であり、金融・法律・税務上の助言ではなく、融資の申込み・見積り・承認でもありません。Repayly は融資や融資の仲介を行いません。

2. 金融機関にご確認ください。実際の返済額は、手数料、保険、端数処理、支払日、金融機関の計算方法により異なる場合があります。判断の前に金融機関に金額をご確認ください。

3. 為替レートは公開の参考サービスから取得したもので、遅延することがあり、参考情報です。

4. 無保証。本アプリは「現状のまま」提供されます。法律で認められる範囲で、計算結果に基づく判断や本アプリの利用により生じた損失について責任を負いません。

5. 利用。本アプリは個人的な目的で利用できます。不正な利用、リバースエンジニアリング、違法な利用はしないでください。

6. Google Play や Firebase などの第三者サービスには、それぞれの規約が適用されます。

7. 本規約は更新されることがあります。引き続き利用することで、更新後の規約に同意したものとみなされます。

8. お問い合わせ：Google Play の Repayly のページに表示されているデベロッパーのメールアドレス。`,
};

const ko: Doc = {
  privacy: `Repayly 개인정보처리방침
시행일: 2026년 11월 11일

Repayly("앱")는 대출 및 월 상환액(EMI) 계산기입니다. 이 방침은 앱이 어떤 정보를 다루는지 설명합니다.

1. 기기에만 저장되는 정보
• 입력한 금액, 금리, 기간, 날짜와 계산 결과 및 계산 기록.
• 언어, 통화, 알림 설정과 앱에서 남긴 평점.
이 정보는 기기에만 저장되며 저희에게 전송되지 않습니다. 앱 데이터를 지우거나 앱을 삭제하면 지워집니다. Android 백업을 켠 경우 Android가 사용자 본인의 기기 백업에 포함할 수 있습니다.

2. 자동으로 수집되는 정보
앱은 Google이 제공하는 Firebase 서비스를 사용합니다.
• Google Analytics for Firebase: 앱 사용 방식(예: 본 화면, 계산 성공 여부, 선택한 대출 유형과 통화)과 기기·앱 정보(기기 모델, Android 버전, 앱 버전, 언어, 앱 인스턴스 식별자, Google이 IP 주소로 추정한 대략적인 위치(국가 또는 지역)). 입력한 금액, 금리, 기간은 전송되지 않습니다.
• Firebase Crashlytics: 문제를 해결하기 위한 비정상 종료 보고서와 진단 정보(기기 모델, Android 버전, 종료 당시 앱 상태).
• Firebase Cloud Messaging: 앱이 알림을 받을 수 있게 하는 기기 토큰.
• Firebase Remote Config: 앱이 설정을 내려받으며, 이를 위해 Firebase가 앱 인스턴스 식별자를 받습니다.
• Google Play 설치 리퍼러: Google Play에서 설치하면 앱이 설치 리퍼러(예: 광고 캠페인을 통한 설치인지 여부)를 읽고 "자연 유입" 또는 "유료" 구분과 캠페인 출처만 기록합니다.
앱은 Android 광고 ID를 수집하지 않습니다. 이 정보는 앱 운영, 오류 수정, 기능 사용 현황 파악에 사용되며 판매하지 않습니다. Google은 자체 약관에 따라 정보를 처리합니다: firebase.google.com/support/privacy, policies.google.com/privacy.

3. 환율
환율 도구는 공개 서비스(api.frankfurter.dev)에 환율을 요청합니다. 요청에는 두 통화 코드만 포함되며, 다른 웹 요청과 마찬가지로 서비스는 IP 주소를 볼 수 있습니다.

4. 알림
알림을 허용하면 앱이 최신 환율을 알림으로 보여 줄 수 있습니다. 앱이나 Android 설정에서 끌 수 있습니다.

5. 보관 기간
Google Analytics는 Firebase 프로젝트에 설정된 기간(2개월 또는 14개월) 동안 사용자 수준 데이터를 보관합니다. Crashlytics는 비정상 종료 스택 추적을 90일간 보관합니다.

6. 아동
앱은 13세 미만 아동을 대상으로 하지 않으며 아동의 정보를 알면서 수집하지 않습니다.

7. 사용자의 선택
앱을 삭제하면 모든 수집이 중단됩니다. 알림은 언제든 끌 수 있습니다. 문의하거나 앱 인스턴스 식별자와 연결된 데이터의 삭제를 요청하려면 Google Play의 Repayly 페이지에 표시된 개발자 이메일로 연락해 주세요.

8. 변경
이 방침은 업데이트될 수 있습니다. 최신 버전은 언제든 앱(설정 → 개인정보처리방침)에서 볼 수 있습니다.

9. 연락처
Google Play의 Repayly 페이지에 표시된 개발자 연락처 이메일을 이용해 주세요.`,
  terms: `Repayly 이용약관
시행일: 2026년 11월 11일

1. 추정치일 뿐입니다. Repayly는 계산기입니다. 결과는 계획을 위한 추정치이며 금융·법률·세무 조언이 아니고, 대출의 제안·견적·승인도 아닙니다. Repayly는 돈을 빌려주거나 대출을 중개하지 않습니다.

2. 대출 기관에 확인하세요. 실제 상환액은 수수료, 보험, 반올림, 납부일, 대출 기관의 계산 방식에 따라 달라질 수 있습니다. 결정하기 전에 대출 기관에 금액을 확인하세요.

3. 환율은 공개 참고 서비스에서 가져오며 지연될 수 있고 참고용입니다.

4. 보증 없음. 앱은 "있는 그대로" 제공됩니다. 법이 허용하는 범위에서 결과를 이용한 결정이나 앱 사용으로 인한 손실에 대해 책임지지 않습니다.

5. 이용. 앱은 개인적인 목적으로 사용할 수 있습니다. 앱을 오용하거나 리버스 엔지니어링하거나 불법적으로 사용하지 마세요.

6. Google Play, Firebase 등 제3자 서비스에는 각자의 약관이 적용됩니다.

7. 이 약관은 업데이트될 수 있습니다. 앱을 계속 사용하면 업데이트된 약관에 동의하는 것으로 봅니다.

8. 연락처: Google Play의 Repayly 페이지에 표시된 개발자 이메일.`,
};

const pt: Doc = {
  privacy: `Política de Privacidade do Repayly
Data de vigência: 11 de novembro de 2026

O Repayly ("o app") é uma calculadora de empréstimos e parcelas (EMI). Esta política explica quais informações o app trata.

1. Informações que ficam no seu aparelho
• Os valores, taxas, prazos e datas que você informa, seus resultados e seu histórico de cálculos.
• Seu idioma, moeda e configurações de notificação, e a avaliação que você dá no app.
Essas informações ficam salvas apenas no seu aparelho e nunca são enviadas para nós. Você pode apagá-las limpando os dados do app ou desinstalando-o. Se o backup do Android estiver ativado, o Android pode incluí-las no backup do seu próprio aparelho.

2. Informações coletadas automaticamente
O app usa serviços do Google Firebase, fornecidos pelo Google:
• Google Analytics para Firebase: como o app é usado (por exemplo, telas vistas, se um cálculo deu certo, o tipo de empréstimo e a moeda escolhidos) e informações do aparelho e do app, como modelo, versão do Android, versão do app, idioma, um identificador da instância do app e localização aproximada (país ou região, estimada pelo Google a partir do seu endereço IP). Os valores, taxas e prazos que você informa nunca são enviados.
• Firebase Crashlytics: relatórios de falhas e informações de diagnóstico (modelo do aparelho, versão do Android, estado do app no momento da falha) para corrigir problemas.
• Firebase Cloud Messaging: um token do aparelho que permite ao app receber notificações.
• Firebase Remote Config: o app baixa configurações; o Firebase recebe um identificador da instância do app para entregá-las.
• Referência de instalação do Google Play: quando o app é instalado pelo Google Play, ele lê a referência de instalação (por exemplo, se a instalação veio de uma campanha de anúncios) e registra apenas a categoria "orgânica" ou "paga" e a origem da campanha.
O app não coleta o ID de publicidade do Android. As informações são usadas para manter o app funcionando, corrigir falhas e entender quais recursos são usados. Elas não são vendidas. O Google as trata conforme seus próprios termos: firebase.google.com/support/privacy e policies.google.com/privacy.

3. Câmbio
A ferramenta de câmbio solicita cotações a um serviço público (api.frankfurter.dev). A solicitação contém apenas os dois códigos de moeda; como em qualquer acesso à web, o serviço pode ver seu endereço IP.

4. Notificações
Se você permitir notificações, o app pode mostrar a cotação mais recente em uma notificação. Você pode desativar isso no app ou nas configurações do Android.

5. Retenção
O Google Analytics mantém os dados no nível do usuário pelo período definido no projeto do Firebase (2 ou 14 meses). O Crashlytics mantém os rastros de falhas por 90 dias.

6. Crianças
O app não é direcionado a menores de 13 anos e não coleta intencionalmente informações deles.

7. Suas escolhas
Desinstalar o app interrompe toda a coleta. Você pode desativar as notificações a qualquer momento. Para tirar dúvidas ou pedir a exclusão dos dados ligados ao seu identificador de instância do app, fale conosco pelo e-mail do desenvolvedor exibido na página do Repayly no Google Play.

8. Alterações
Esta política pode ser atualizada. A versão atual está sempre disponível no app (Configurações → Política de Privacidade).

9. Contato
Use o e-mail de contato do desenvolvedor exibido na página do Repayly no Google Play.`,
  terms: `Termos de Uso do Repayly
Data de vigência: 11 de novembro de 2026

1. Apenas estimativas. O Repayly é uma calculadora. Seus resultados são estimativas para planejamento. Não são aconselhamento financeiro, jurídico ou tributário, nem uma oferta, cotação ou aprovação de crédito. O Repayly não empresta dinheiro nem intermedeia empréstimos.

2. Confirme com o credor. Os pagamentos reais podem variar por taxas, seguros, arredondamentos, datas de pagamento e pelo método do credor. Confirme os valores com o credor antes de decidir.

3. As cotações de câmbio vêm de um serviço público de referência, podem ter atraso e são apenas informativas.

4. Sem garantia. O app é fornecido "no estado em que se encontra". Na medida permitida pela lei, não nos responsabilizamos por decisões tomadas com base nos resultados nem por perdas decorrentes do uso do app.

5. Uso. Você pode usar o app para fins pessoais. Não faça uso indevido, engenharia reversa ou uso ilegal do app.

6. Serviços de terceiros, como Google Play e Firebase, têm seus próprios termos.

7. Estes termos podem ser atualizados. Continuar usando o app significa aceitar os termos atualizados.

8. Contato: o e-mail do desenvolvedor exibido na página do Repayly no Google Play.`,
};

export const LEGAL: Record<Language, Doc> = { en, es, 'zh-Hans': zh, ja, ko, 'pt-BR': pt };
