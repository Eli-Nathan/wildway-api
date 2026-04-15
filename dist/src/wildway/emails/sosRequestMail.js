"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSOSAcceptedMailContent = exports.getSOSRequestMailContent = void 0;
const getEmailTemplate_1 = __importDefault(require("./getEmailTemplate"));
const getSOSRequestBody = (senderName) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  SOS Contact Request
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong><b>${senderName}</b></strong> wants to add you as an SOS contact on <span style="color:#F45B69">wildway</span>.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  SOS contacts can share trip plans with you and you'll be notified of their check-ins and if they become overdue.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <a target="_blank" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#2D3142;font-size:18px;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif" href="https://wildway.app/account?initialTab=SOS%20Contacts">Open the app</a> to accept or decline this request.
</p>
`;
const getSOSAcceptedBody = (accepterName) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  Request Accepted!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong><b>${accepterName}</b></strong> accepted your SOS contact request on <span style="color:#F45B69">wildway</span>.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  You can now share trip plans with them and they'll be automatically accepted.
</p>
`;
const getSOSRequestMailContent = (senderName) => ({
    subject: `${senderName} wants to add you as an SOS contact on Wildway`,
    text: `${senderName} has sent you an SOS contact request on Wildway. SOS contacts can share trip plans with you and you'll be notified of their check-ins and if they become overdue. Open the app to accept or decline: https://wildway.app/account?initialTab=SOS%20Contacts`,
    html: (0, getEmailTemplate_1.default)(getSOSRequestBody(senderName)),
});
exports.getSOSRequestMailContent = getSOSRequestMailContent;
const getSOSAcceptedMailContent = (accepterName) => ({
    subject: `${accepterName} accepted your SOS contact request on Wildway`,
    text: `${accepterName} has accepted your SOS contact request on Wildway. You can now share trip plans with them and they'll be automatically accepted.`,
    html: (0, getEmailTemplate_1.default)(getSOSAcceptedBody(accepterName)),
});
exports.getSOSAcceptedMailContent = getSOSAcceptedMailContent;
