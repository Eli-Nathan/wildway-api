import getEmailTemplate from "./getEmailTemplate";

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const getMainBody = (name: string, documentId: string): string => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  New user!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  New user: <strong><b>${name}</b></strong> has registered a new account. <a target="_blank" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#2D3142;font-size:18px;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif" href="https://api.wildway.app/admin/content-manager/collection-types/api::auth-user.auth-user/${documentId}">View user</a>..
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  Check them out and decide if they're a test user or real user.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
`;

const getPlainText = (name: string, documentId: string): string => `
New user!
New user: ${name} has registered a new account. Document ID: ${documentId}
Check them out and decide if they're a test user or real user.
`;

const newUserAdded = (name: string, documentId: string): EmailContent => {
  const text = getPlainText(name, documentId);
  const htmlBody = getMainBody(name, documentId);
  const html = getEmailTemplate(htmlBody);
  return {
    subject: "New wildway user",
    text,
    html,
  };
};

export default newUserAdded;
