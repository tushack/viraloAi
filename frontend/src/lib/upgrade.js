export function redirectToUpgrade(navigate, error) {
  if (error?.code !== "UPGRADE_REQUIRED") {
    return false;
  }

  navigate("/payment", {
    state: {
      upgrade: error.upgrade || null,
    },
  });

  return true;
}