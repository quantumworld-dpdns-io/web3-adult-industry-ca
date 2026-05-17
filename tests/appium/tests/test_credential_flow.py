import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options
from desired_capabilities import ANDROID_CAPS

class TestCredentialFlow:
    @pytest.fixture(autouse=True)
    def setup(self):
        options = UiAutomator2Options().load_capabilities(ANDROID_CAPS)
        self.driver = webdriver.Remote("http://localhost:4723", options=options)
        yield
        self.driver.quit()

    def test_view_credentials_list(self):
        credentials_tab = self.driver.find_element(by="accessibility_id", value="Credentials")
        credentials_tab.click()
        assert self.driver.find_element(by="accessibility_id", value="credentials-list").is_displayed()

    def test_scan_qr_code(self):
        scan_tab = self.driver.find_element(by="accessibility_id", value="Scan")
        scan_tab.click()
        assert self.driver.find_element(by="accessibility_id", value="scanner-view").is_displayed()

    def test_view_profile(self):
        profile_tab = self.driver.find_element(by="accessibility_id", value="Profile")
        profile_tab.click()
        assert self.driver.find_element(by="accessibility_id", value="profile-view").is_displayed()

    def test_credential_detail(self):
        credentials_tab = self.driver.find_element(by="accessibility_id", value="Credentials")
        credentials_tab.click()
        first_card = self.driver.find_element(by="xpath", value="//android.widget.ScrollView[1]/android.view.View[1]")
        first_card.click()
        assert self.driver.find_element(by="accessibility_id", value="credential-detail").is_displayed()
