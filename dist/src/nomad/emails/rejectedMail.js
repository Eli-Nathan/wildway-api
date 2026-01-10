"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getEmailTemplate_1 = __importDefault(require("./getEmailTemplate"));
const getMainBody = (type, title) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Uh oh!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  We have reviewed your <strong><b>${type}</b></strong> for <strong><b>${title}</b></strong> and unfortuntely we've not been able to approve it.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  There are a few reasons why this might have happened. The information you provided may have been inaccurate or harmful or it may have been that we simply couldn't verify it.
  <br>
  <br>
  If you think this has been a mistake, please reply to this email.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  People like you are what make <span style="color:#F45B69">wildway</span> so great! Thanks for your support!
</p>
`;
const getPlainText = (type, title) => `
Uh oh!
We have reviewed your ${type} for ${title} and unfortuntely we've not been able to approve it.
There are a few reasons why this might have happened. The information you provided may have been inaccurate or harmful or it may have been that we simply couldn't verify it.
If you think this has been a mistake, please reply to this email.
People like you are what make wildway so great! Thanks for your support!

Thanks!

Eli & Seana

wildway
`;
const getRejectedMailContent = (collection, title) => {
    const type = collection.replace("-", " ");
    const text = getPlainText(type, title);
    const htmlBody = getMainBody(type, title);
    const html = (0, getEmailTemplate_1.default)(htmlBody);
    return {
        subject: `Your ${type} was rejected`,
        text,
        html,
    };
};
exports.default = getRejectedMailContent;
