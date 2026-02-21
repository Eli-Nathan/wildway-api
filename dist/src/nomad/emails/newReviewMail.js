"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getEmailTemplate_1 = __importDefault(require("./getEmailTemplate"));
const getStarRating = (rating) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
};
const getMainBody = (data) => `
<h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#f45b69">
  New review for ${data.siteTitle}!
</h3>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <strong>${data.reviewerName}</strong> left a review on your listing.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<div style="background-color:#f5f5f5;padding:20px;border-radius:8px;border-left:4px solid #f45b69;">
  <p style="Margin:0;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:24px;color:#FBCD4B;letter-spacing:2px;">
    ${getStarRating(data.rating)}
  </p>
  <p style="Margin:10px 0 0 0;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:18px;font-weight:bold;color:#2D3142;">
    "${data.title}"
  </p>
  ${data.review
    ? `<p style="Margin:10px 0 0 0;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;font-size:16px;color:#666;font-style:italic;">
    "${data.review}"
  </p>`
    : ""}
</div>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  View your listing and respond to this review on <a target="_blank" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#f45b69;font-size:18px;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif" href="https://wildway.app/places/${data.siteSlug}">wildway</a>.
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  <br>
</p>
<p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'merriweather sans', 'helvetica neue', helvetica, arial, sans-serif;line-height:27px;color:#2D3142;font-size:18px">
  Thank you for being part of the <span style="color:#F45B69">wildway</span> community!
</p>
`;
const getPlainText = (data) => `
New review for ${data.siteTitle}!

${data.reviewerName} left a ${data.rating}-star review on your listing.

"${data.title}"
${data.review ? `"${data.review}"` : ""}

View your listing and respond to this review: https://wildway.app/places/${data.siteSlug}

Thank you for being part of the wildway community!

Eli & Seana
wildway
`;
const getNewReviewMailContent = (data) => {
    const text = getPlainText(data);
    const htmlBody = getMainBody(data);
    const html = (0, getEmailTemplate_1.default)(htmlBody);
    return {
        subject: `New ${data.rating}-star review for ${data.siteTitle}`,
        text,
        html,
    };
};
exports.default = getNewReviewMailContent;
