"""Business values the shop runs on. Change them here, not in the environment;
the storefront reads them from /config, so its copy follows."""

CURRENCY = "INR"

# Standard shipping is free from this subtotal up; below it, it costs STANDARD_SHIPPING_FEE.
FREE_SHIPPING_THRESHOLD = 1499
STANDARD_SHIPPING_FEE = 199

MAX_PER_PRODUCT = 10  # most of one piece a single order can hold, across all its colours

PARTIAL_SHARE = 0.5  # share of the total paid online on the partial plan
# Added to the total on the cash-on-delivery plan, only when shipping is free (orders over FREE_SHIPPING_THRESHOLD).
# When the customer is already paying for shipping, cash on delivery costs nothing extra.
COD_FEE = 99
