/** Instagram, Facebook, Messenger and similar apps open links in an embedded browser where Google
 *  refuses to sign anyone in (403 disallowed_useragent). Guest checkout still works there. */
export const isInAppBrowser = () =>
  typeof navigator !== 'undefined' && /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Snapchat|Line\/|Twitter|LinkedInApp/i.test(navigator.userAgent)
