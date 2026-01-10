import getEmailTemplate from "./getEmailTemplate";

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const getMainBody = (
  type: string,
  title: string,
  slug: string,
  points: number
): string => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Good news!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  We have reviewed your <strong><b>${type}</b></strong> for <strong><b>${title}</b></strong> and we've approved it!
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  You now see it on the app <a target="_blank" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#2D3142;font-size:18px;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif" href="https://wildway.app/places/${slug}">here</a>.
  Your user reputation score has been increased by <strong><b>${points}</b></strong>. Keep adding/editing places and adding comments or reviews to build your reputation.
  <br>
  <br>
  If you have any questions then please reply to this email.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  People like you are what make <span style="color:#F45B69">wildway</span> so great! Thanks for your support!
</p>
`;

const getPlainText = (
  type: string,
  title: string,
  slug: string,
  points: number
): string => `
Good news!
We have reviewed your ${type} for ${title} and we've approved it!
You now see it on the app here: https://wildway.app/places/${slug}.
Your user reputation score has been increased by ${points}. Keep adding/editing places and adding comments or reviews to build your reputation.
People like you are what make wildway so great! Thanks for your support!

Thanks!

Eli & Seana

wildway
`;

const getApprovedMailContent = (
  collection: string,
  title: string,
  slug: string,
  points: number
): EmailContent => {
  const type = collection.replace("-", " ");
  const text = getPlainText(type, title, slug, points);
  const htmlBody = getMainBody(type, title, slug, points);
  const html = getEmailTemplate(htmlBody);
  return {
    subject: `Your ${type} was approved!`,
    text,
    html,
  };
};

export default getApprovedMailContent;
