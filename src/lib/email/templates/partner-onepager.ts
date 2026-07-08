/**
 * Partner One-Pager Email Template
 *
 * Outbound email sent to property managers / vacation rental partners after
 * they sign up via /partners/vacation-rentals (or scan a QR code on a
 * Premier Party Cruises boat). Comes with the partner one-pager PDF as an
 * attachment and a CTA to schedule a 15-min call.
 *
 * The HTML is verbatim from the designed-and-tested template at
 * `tmp-pod-partner-email.html`; placeholders for the Calendly URL and
 * unsubscribe link are interpolated below.
 */

export interface PartnerOnePagerEmailData {
  /** Partner's Calendly / scheduling URL */
  calendlyUrl: string;
  /** URL the email's unsubscribe link points at — typically a mailto: */
  unsubscribeUrl: string;
}

export function generatePartnerOnePagerEmail(data: PartnerOnePagerEmailData): string {
  const { calendlyUrl, unsubscribeUrl } = data;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Party On Delivery — Partner Program</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  /* These rarely render — everything important is inlined below. Used only as progressive enhancement for clients that DO support <style>. */
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap');
  body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; }
  table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  .display-font { font-family: 'Barlow Condensed', 'Arial Narrow', 'Helvetica Condensed', Arial, sans-serif !important; }
  /* Mobile */
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
    .stack-mobile { display: block !important; width: 100% !important; }
    .h1-mobile { font-size: 36px !important; line-height: 38px !important; }
    .h2-mobile { font-size: 26px !important; line-height: 30px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#FAF6EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#11181C;">

<!-- Preview text (shows in inbox preview, hidden in email body) -->
<div style="display:none; font-size:1px; color:#FAF6EE; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
  TABC-licensed alcohol delivery, signature cocktails, and bartender coordination for your luxury rentals. Here's the partner one-pager you requested.
</div>

<!-- Outer wrapper -->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF6EE;">
<tr>
<td align="center" style="padding:32px 16px;">

  <!-- Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px; max-width:600px; background-color:#FFFFFF;">

    <!-- ============ HEADER ============ -->
    <tr>
      <td style="padding:24px 32px; border-bottom:1px solid rgba(10,31,51,0.08);" class="px-mobile">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left" valign="middle">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png"
                   alt="Party On Delivery"
                   width="160"
                   style="width:160px; max-width:100%; height:auto; display:block; border:0;" />
            </td>
            <td align="right" valign="middle" style="font-family: 'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.15em; text-transform:uppercase;" class="display-font">
              Partner Program
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ HERO IMAGE ============ -->
    <tr>
      <td style="padding:0;">
        <img src="https://partyondelivery.com/email-assets/pod-cocktail-kits.jpg"
             alt="POD signature cocktail kits — Rum Punch, Arnold Palmer, Austin Ritas"
             width="600"
             style="display:block; width:100%; max-width:600px; height:auto; border:0;" />
      </td>
    </tr>

    <!-- ============ HEADLINE BLOCK ============ -->
    <tr>
      <td style="padding:40px 40px 16px 40px; background-color:#FFFFFF;" class="px-mobile">
        <p style="margin:0 0 16px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
          For luxury STR property managers
        </p>
        <h1 class="h1-mobile display-font" style="margin:0 0 20px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:44px; line-height:44px; font-weight:800; color:#11181C; letter-spacing:-0.01em;">
          The bar program your luxury rentals have been missing.
        </h1>
        <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:16px; line-height:24px; color:#5A6671;">
          TABC-licensed alcohol delivery, pre-batched craft cocktails, bartender coordination, and full bar setup &mdash; all from one Austin-owned partner.
        </p>
      </td>
    </tr>

    <!-- ============ PRIMARY CTA ============ -->
    <tr>
      <td align="left" style="padding:8px 40px 32px 40px;" class="px-mobile">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" bgcolor="#0B74B8" style="background-color:#0B74B8; border-radius:0;">
              <a href="${calendlyUrl}" target="_blank"
                 style="display:inline-block; padding:16px 32px; font-family:'Barlow Condensed', Arial, sans-serif; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; letter-spacing:0.08em; text-transform:uppercase;">
                Schedule a 15-min meeting &rarr;
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:13px; color:#5A6671;">
          We'll walk through your portfolio and how partnership works.
        </p>
      </td>
    </tr>

    <!-- ============ DIVIDER ============ -->
    <tr>
      <td style="padding:0 40px;" class="px-mobile">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="border-top:1px solid rgba(10,31,51,0.08); height:1px; line-height:1px; font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>

    <!-- ============ THE GAP ============ -->
    <tr>
      <td style="padding:32px 40px 8px 40px;" class="px-mobile">
        <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
          The Gap
        </p>
        <h2 class="h2-mobile display-font" style="margin:0 0 16px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:30px; line-height:32px; font-weight:800; color:#11181C; letter-spacing:-0.01em;">
          Most concierge stacks fall apart at the bar.
        </h2>
        <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#5A6671;">
          Property managers either route guests to grocery delivery (which can't legally deliver alcohol in Texas), book a separate bartender, or leave it as the guest's problem. The result is a hospitality gap that costs reviews.
        </p>
      </td>
    </tr>

    <!-- ============ HOW PARTNERSHIP WORKS ============ -->
    <tr>
      <td style="padding:32px 40px 8px 40px;" class="px-mobile">
        <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
          How partnership works
        </p>
        <h2 class="h2-mobile display-font" style="margin:0 0 16px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:30px; line-height:32px; font-weight:800; color:#11181C; letter-spacing:-0.01em;">
          A branded link that earns you revenue.
        </h2>
        <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#5A6671;">
          We give you a white-label ordering link for your guest welcome packet &mdash; looks like your concierge, powered by us. You earn a revenue share on every order: <strong style="color:#11181C;">5% to start, rising to 8% and 10%</strong> as your booking volume grows. No upfront cost, no monthly minimums.
        </p>
      </td>
    </tr>

    <!-- ============ WHAT WE HANDLE ============ -->
    <tr>
      <td style="padding:32px 40px 16px 40px;" class="px-mobile">
        <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
          What POD handles
        </p>
        <h2 class="h2-mobile display-font" style="margin:0 0 24px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:30px; line-height:32px; font-weight:800; color:#11181C; letter-spacing:-0.01em;">
          One vendor. The whole bar program.
        </h2>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="top" style="padding:0 0 16px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="top" width="40" style="padding-top:2px;">
                    <span style="font-family:'Barlow Condensed', Arial, sans-serif; font-size:24px; font-weight:800; color:#0B74B8; font-style:italic;">01</span>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 4px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:18px; font-weight:700; color:#11181C; letter-spacing:-0.01em;" class="display-font">
                      TABC-licensed delivery
                    </p>
                    <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:14px; line-height:20px; color:#5A6671;">
                      Beer, wine, spirits, mixers, ice. Direct to the property. Legally. ID checks at handoff.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding:0 0 16px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="top" width="40" style="padding-top:2px;">
                    <span style="font-family:'Barlow Condensed', Arial, sans-serif; font-size:24px; font-weight:800; color:#0B74B8; font-style:italic;">02</span>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 4px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:18px; font-weight:700; color:#11181C; letter-spacing:-0.01em;" class="display-font">
                      20+ signature cocktails, pre-batched
                    </p>
                    <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:14px; line-height:20px; color:#5A6671;">
                      Built with Texas spirits and Fresh Victor mixers. Lady Bird Margarita, Barton Springs Mojito, Rainey Street Paloma, plus mocktails.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding:0 0 16px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="top" width="40" style="padding-top:2px;">
                    <span style="font-family:'Barlow Condensed', Arial, sans-serif; font-size:24px; font-weight:800; color:#0B74B8; font-style:italic;">03</span>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 4px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:18px; font-weight:700; color:#11181C; letter-spacing:-0.01em;" class="display-font">
                      Bartender coordination
                    </p>
                    <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:14px; line-height:20px; color:#5A6671;">
                      Vetted local bartenders, scheduled and supplied. Setup, service, breakdown.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding:0 0 0 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="top" width="40" style="padding-top:2px;">
                    <span style="font-family:'Barlow Condensed', Arial, sans-serif; font-size:24px; font-weight:800; color:#0B74B8; font-style:italic;">04</span>
                  </td>
                  <td valign="top">
                    <p style="margin:0 0 4px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:18px; font-weight:700; color:#11181C; letter-spacing:-0.01em;" class="display-font">
                      Boat &amp; lake delivery + same-day restock
                    </p>
                    <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:14px; line-height:20px; color:#5A6671;">
                      Lake Travis, Lake Austin, Lake LBJ, Paradise Cove. Dock, slip, or front door &mdash; including same-day restock.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ PRODUCT STRIP ============ -->
    <tr>
      <td style="padding:8px 40px 0 40px;" class="px-mobile">
        <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
          What arrives at the property
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="top" width="50%" style="padding-right:6px;">
              <img src="https://partyondelivery.com/email-assets/pod-stocked-fridge.jpg"
                   alt="Pre-stocked fridge with Karbach Ranch Water, High Noon, prosecco, and mixers"
                   width="260"
                   style="display:block; width:100%; max-width:260px; height:auto; border:0;" />
              <p style="margin:8px 0 0 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:13px; font-weight:700; color:#11181C; letter-spacing:-0.005em;" class="display-font">
                Pre-stocked, pre-chilled
              </p>
              <p style="margin:2px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#5A6671;">
                Sorted by use case. Welcome cocktails chilled and waiting.
              </p>
            </td>
            <td valign="top" width="50%" style="padding-left:6px;">
              <img src="https://partyondelivery.com/email-assets/pod-finished-drink.jpg"
                   alt="Finished signature cocktail with mint and lemon peel garnish"
                   width="260"
                   style="display:block; width:100%; max-width:260px; height:auto; border:0;" />
              <p style="margin:8px 0 0 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:13px; font-weight:700; color:#11181C; letter-spacing:-0.005em;" class="display-font">
                Hotel-grade presentation
              </p>
              <p style="margin:2px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#5A6671;">
                What shows up in their photos. Not a red Solo cup.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ TABC DIFFERENTIATOR — DARK BLOCK ============ -->
    <tr>
      <td style="padding:32px 40px 0 40px;" class="px-mobile">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0A1F33;">
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#F2D34F; letter-spacing:0.18em; text-transform:uppercase;" class="display-font">
                The legal differentiator
              </p>
              <h2 class="h2-mobile display-font" style="margin:0 0 12px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:28px; line-height:30px; font-weight:800; color:#FAF6EE; letter-spacing:-0.01em;">
                We hold the TABC license.<br/>You hold zero liability.
              </h2>
              <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:14px; line-height:22px; color:rgba(250,246,238,0.75);">
                In Texas, alcohol delivery requires a TABC license, ID verification, and proper insurance. POD carries all three &mdash; so you can offer concierge alcohol service to guests with no exposure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ SOCIAL PROOF ============ -->
    <tr>
      <td style="padding:32px 40px 8px 40px;" class="px-mobile">
        <p style="margin:0 0 16px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:11px; font-weight:600; color:#0B74B8; letter-spacing:0.18em; text-transform:uppercase; text-align:center;" class="display-font">
          Trusted by Austin's hospitality leaders
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:13px; line-height:18px; color:#5A6671; text-align:center;">
                Premier Party Cruises &nbsp;&middot;&nbsp; Paradise Cove Marina &nbsp;&middot;&nbsp; Anderson Mill Marina &nbsp;&middot;&nbsp; Cocktail Cowboys
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF6EE;">
          <tr>
            <td style="padding:24px 24px;">
              <p style="margin:0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-style:italic; font-size:16px; line-height:24px; color:#11181C;">
                &ldquo;The entire process was smooth and easy with a seamless integration with the client portal link. And the drinks choice for selection was great and they were reasonably priced. Can&rsquo;t be happier.&rdquo;
              </p>
              <p style="margin:0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:14px; font-weight:700; color:#11181C;" class="display-font">
                Ravi Peri &nbsp;&middot;&nbsp; <span style="font-weight:400; color:#5A6671;">Google review</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ FINAL CTA ============ -->
    <tr>
      <td style="padding:40px 40px 8px 40px;" class="px-mobile">
        <h2 class="h2-mobile display-font" style="margin:0 0 12px 0; font-family:'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; font-size:32px; line-height:34px; font-weight:800; color:#11181C; letter-spacing:-0.01em;">
          Let's talk.
        </h2>
        <p style="margin:0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:15px; line-height:22px; color:#5A6671;">
          15 minutes. We'll walk through your portfolio, show you the partner dashboard, and outline what a partnership looks like for your properties.
        </p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" bgcolor="#0B74B8" style="background-color:#0B74B8;">
              <a href="${calendlyUrl}" target="_blank"
                 style="display:inline-block; padding:16px 32px; font-family:'Barlow Condensed', Arial, sans-serif; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; letter-spacing:0.08em; text-transform:uppercase;">
                Schedule a 15-min meeting &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ FORWARD HINT ============ -->
    <tr>
      <td style="padding:24px 40px 32px 40px;" class="px-mobile">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid rgba(10,31,51,0.08);">
          <tr>
            <td style="padding:20px 0 0 0;">
              <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:13px; line-height:20px; color:#5A6671;">
                Need to share with a partner or owner? The full one-pager PDF is attached &mdash; or forward this email directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ============ FOOTER ============ -->
    <tr>
      <td style="padding:24px 40px; background-color:#11181C;" class="px-mobile">
        <p style="margin:0 0 8px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-size:18px; font-weight:800; color:#FAF6EE; letter-spacing:-0.01em;" class="display-font">
          PARTY ON DELIVERY
        </p>
        <p style="margin:0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:rgba(250,246,238,0.55);">
          Austin, Texas<br/>
          partyondelivery.com &nbsp;&middot;&nbsp; allan@partyondelivery.com &nbsp;&middot;&nbsp; 737.371.9700
        </p>
        <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; font-size:11px; color:rgba(250,246,238,0.4);">
          You're receiving this because you signed up at partyondelivery.com/partners/vacation-rentals.
          <br/>
          <a href="${unsubscribeUrl}" style="color:rgba(250,246,238,0.55); text-decoration:underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>

  </table>
</td>
</tr>
</table>

</body>
</html>`;
}

export function generatePartnerOnePagerEmailText(data: PartnerOnePagerEmailData): string {
  const { calendlyUrl } = data;
  return `Party On Delivery — Partner Program

The bar program your luxury rentals have been missing.

TABC-licensed alcohol delivery, pre-batched craft cocktails, bartender coordination, and full bar setup — all from one Austin-owned partner.

Schedule a 15-min meeting:
${calendlyUrl}

How partnership works:
We give you a white-label ordering link for your guest welcome packet — looks like your concierge, powered by us. You earn a revenue share on every order: 5% to start, rising to 8% and 10% as your booking volume grows. No upfront cost, no monthly minimums.

What POD handles:
  01. TABC-licensed delivery — beer, wine, spirits, mixers, ice. Direct to the property. ID checks at handoff.
  02. 20+ signature cocktails, pre-batched — Texas spirits + Fresh Victor mixers. Lady Bird Margarita, Barton Springs Mojito, Rainey Street Paloma, plus mocktails.
  03. Bartender coordination — vetted local bartenders, scheduled and supplied. Setup, service, breakdown.
  04. Boat & lake delivery + same-day restock — Lake Travis, Lake Austin, Lake LBJ, Paradise Cove.

The legal differentiator: We hold the TABC license. You hold zero liability.

Trusted by Premier Party Cruises, Paradise Cove Marina, and Austin's hospitality leaders.

The full one-pager PDF is attached. Need to share with a partner or owner — just forward this email.

—
Party On Delivery
partyondelivery.com · allan@partyondelivery.com · 737.371.9700
Austin, Texas
`;
}
