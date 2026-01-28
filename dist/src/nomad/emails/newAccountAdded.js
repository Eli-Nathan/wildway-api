"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getEmailTemplate_1 = __importDefault(require("./getEmailTemplate"));
const getMainBody = (name, id) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  New user!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  New user: <strong><b>${name}</b></strong> has registered a new account. <a target="_blank" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#2D3142;font-size:18px;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif" href="https://api.wildway.app/admin/content-manager/collectionType/api::auth-user.auth-user/${id}">View user</a>..
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
const getPlainText = (name, id) => `
New user!
New user: ${name} has registered a new account. ID: ${id}
Check them out and decide if they're a test user or real user.
`;
const newUserAdded = (name, id) => {
    const text = getPlainText(name, id);
    const htmlBody = getMainBody(name, id);
    const html = (0, getEmailTemplate_1.default)(htmlBody);
    return {
        subject: "New wildway user",
        text,
        html,
    };
};
exports.default = newUserAdded;
