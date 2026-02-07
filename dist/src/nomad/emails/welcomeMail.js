"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getEmailTemplate_1 = __importDefault(require("./getEmailTemplate"));
const getMainBody = (displayName) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Welcome to the wildway community!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  Hey${displayName ? ` ${displayName}` : ""}! Your account has been verified and you're now officially part of the <span style="color:#F45B69">wildway</span> community.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  Here's what you can do now:
</p>
<ul style="font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px;margin:10px 0;">
  <li>Discover hidden gems and off-the-beaten-path spots</li>
  <li>Add your own favourite places to share with fellow explorers</li>
  <li>Leave reviews and tips to help the community</li>
  <li>Build your reputation as you contribute</li>
</ul>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  We're so glad to have you with us. If you have any questions, just reply to this email.
</p>
`;
const getPlainText = (displayName) => `
Welcome to the wildway community!

Hey${displayName ? ` ${displayName}` : ""}! Your account has been verified and you're now officially part of the wildway community.

Here's what you can do now:
- Discover hidden gems and off-the-beaten-path spots
- Add your own favourite places to share with fellow explorers
- Leave reviews and tips to help the community
- Build your reputation as you contribute

We're so glad to have you with us. If you have any questions, just reply to this email.

Thanks!

Eli & Seana

wildway
`;
const getWelcomeMailContent = (displayName = "") => {
    const text = getPlainText(displayName);
    const htmlBody = getMainBody(displayName);
    const html = (0, getEmailTemplate_1.default)(htmlBody);
    return {
        subject: "Welcome to wildway!",
        text,
        html,
    };
};
exports.default = getWelcomeMailContent;
