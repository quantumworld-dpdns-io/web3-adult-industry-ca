from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class ScanPage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    @property
    def scanner_view(self):
        return self.wait.until(
            EC.presence_of_element_located(
                (AppiumBy.ACCESSIBILITY_ID, "scanner-view")
            )
        )

    def is_displayed(self) -> bool:
        return self.scanner_view.is_displayed()
