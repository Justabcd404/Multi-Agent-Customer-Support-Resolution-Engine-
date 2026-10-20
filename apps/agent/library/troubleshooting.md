# Technical Troubleshooting Guide

## Login and Authentication Errors
If a user experiences login errors or app crashes:
- Ensure the app is updated to the latest version.
- Clear cached browser session data or app cache.
- Error `ERR_AUTH_500` indicates an expired or corrupted session token. The user should log out completely and log back in.

## Checkout & Payment Page Crashes
If the checkout page hangs or returns `ERR_CHK_402`:
- This occurs when the payment gateway times out during 3D-Secure verification.
- Users should refrain from clicking 'Submit Payment' multiple times to avoid duplicate holds.
- If a double pending charge appears, it will automatically drop off within 3-5 business days or can be refunded immediately by support.
