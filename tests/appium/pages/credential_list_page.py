from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class CredentialListPage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    @property
    def list_view(self):
        return self.wait.until(
            EC.presence_of_element_located(
                (AppiumBy.ACCESSIBILITY_ID, "credentials-list")
            )
        )

    @property
    def first_card(self):
        return self.wait.until(
            EC.presence_of_element_located(
                (AppiumBy.XPATH, "//android.widget.ScrollView[1]/android.view.View[1]")
            )
        )

    @property
    def detail_view(self):
        return self.wait.until(
            EC.presence_of_element_located(
                (AppiumBy.ACCESSIBILITY_ID, "credential-detail")
            )
        )

    def is_displayed(self) -> bool:
        return self.list_view.is_displayed()

    def tap_first_card(self):
        self.first_card.click()
        return self

    def get_card_count(self) -> int:
        return len(
            self.driver.find_elements(
                AppiumBy.XPATH, "//*[contains(@content-desc, 'credential-card')]"
            )
        )
