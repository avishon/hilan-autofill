document.addEventListener("DOMContentLoaded", function () {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    //alert('updated from contentscript');
  });

  function restrictNumber(e) {
    var newValue = this.value.replace(new RegExp(/[^\d]/, "ig"), "");
    this.value = newValue;
  }

  function restrictValue(e) {
    var valueMin = Number(e.target.getAttribute("min"));
    var valueMax = Number(e.target.getAttribute("max"));
    this.value =
      this.value > valueMax
        ? valueMax
        : this.value < valueMin
        ? valueMin
        : this.value;
    return this.value;
  }

  function autoFocusNextField(e) {
    var nextFocusElementId = e.target.getAttribute("next-focus");
    var maxLength = Number(e.target.getAttribute("maxlength"));
    if (nextFocusElementId) {
      var nextFocusEl = document.querySelector(`#${nextFocusElementId}`);
      if (this.value.length === maxLength) {
        nextFocusEl.focus();
      }
    }
  }

  function setTowNumbers(e) {
    if (e.value.length === 1) {
      e.value = `0${e.value}`;
    }
  }

  var inputHoursEntry = document.querySelector("#entry_hours");
  var inputMinutesEntry = document.querySelector("#entry_minutes");
  var inputHoursExit = document.querySelector("#exit_hours");
  var inputMinutesExit = document.querySelector("#exit_minutes");
  var inputProjectName = document.querySelector("#project_name");
  var inputsTimeAll = document.querySelectorAll(".input-item.time");
  var autoFillButton = document.querySelector("#auto_fill_btn");
  var inputRemember = document.querySelector("#remember");
  var inputRadioErrorDays = document.querySelector("#errors_days");
  var inputRadioSelectedDays = document.querySelector("#selected_days");

  function fillPopupFromCacheData() {
    chrome.storage.sync.get("popupFormValue", function ({ popupFormValue }) {
      if (popupFormValue && popupFormValue.remember) {
        inputHoursEntry.value = popupFormValue.entryHours;
        inputMinutesEntry.value = popupFormValue.entryMinutes;
        inputHoursExit.value = popupFormValue.exitHours;
        inputMinutesExit.value = popupFormValue.exitMinutes;
        inputProjectName.value = popupFormValue.projectName;
        inputRadioErrorDays.checked = !popupFormValue.radioSelectedDaysChecked;
        inputRadioSelectedDays.checked =
          popupFormValue.radioSelectedDaysChecked;
        inputRemember.checked = popupFormValue.remember;
      }
    });
  }

  fillPopupFromCacheData();

  inputsTimeAll.forEach((item) => {
    item.addEventListener("input", restrictNumber);
    item.addEventListener("input", restrictValue);
    item.addEventListener("input", autoFocusNextField);
  });

  autoFillButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    inputsTimeAll.forEach((item) => {
      setTowNumbers(item);
    });

    chrome.storage.sync.set({
      popupFormValue: {
        entryHours: inputHoursEntry.value || "00",
        entryMinutes: inputMinutesEntry.value || "00",
        exitHours: inputHoursExit.value || "00",
        exitMinutes: inputMinutesExit.value || "00",
        projectName: inputProjectName.value,
        radioErrorDaysChecked: !inputRadioSelectedDays.checked,
        radioSelectedDaysChecked: inputRadioSelectedDays.checked,
        remember: inputRemember.checked,
      },
    });
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      function: init,
    });
  });
});

function init() {
  var formValue;
  var projectSearchInputRows;
  var projectCurrentIndex;

  chrome.storage.sync.get("popupFormValue", function ({ popupFormValue }) {
    formValue = popupFormValue;
    if (formValue.radioSelectedDaysChecked) {
      clickSelectedDaysButton();
    } else {
      clickErrorsDaysButton();
    }

    setTimeout(() => fillTime(), 2000);
    setTimeout(() => fillProjectName(), 2000);
  });

  function fillTime() {
    document.querySelectorAll('input[id*="ManualEntry"]').forEach((item) => {
      if (item.value == "") {
        item.value = `${formValue.entryHours}:${formValue.entryMinutes}`;
      }
      var event = new Event("blur", {
        bubbles: true,
        cancelable: true,
      });
      item.dispatchEvent(event);
    });
    document.querySelectorAll('input[id*="ManualExit"]').forEach((item) => {
      if (item.value == "") {
        item.value = `${formValue.exitHours}:${formValue.exitMinutes}`;
      }
      var event = new Event("blur", {
        bubbles: true,
        cancelable: true,
      });
      item.dispatchEvent(event);
    });
  }

  function clickErrorsDaysButton() {
    var errorDaysButton = document.querySelector(
      'input[id*="RefreshErrorsDays"]'
    );
    errorDaysButton.click();
  }

  function clickSelectedDaysButton() {
    var selectedDaysButton = document.querySelector(
      'input[id*="RefreshSelectedDays"]'
    );
    selectedDaysButton.click();
  }

  // (project -step 1) Fill project (first row)
  function fillProjectName() {
    if (!formValue.projectName) {
      return;
    }
    projectCurrentIndex = 0;
    projectSearchInputRows = document.querySelectorAll(
      'input[name*="ProjectForView"][type="text"]'
    );
    openProjectDropDown(projectSearchInputRows[projectCurrentIndex]);
  }

  // (project -step 2) Open project drop down, then click on the selected option item
  function openProjectDropDown(searchInputEl) {
    if (!searchInputEl) {
      return;
    }
    searchInputEl.value = "";
    searchInputEl.value = formValue.projectName;
    setTimeout(() => {
      var evt = document.createEvent("Events");
      evt.initEvent("keydown", true, true);
      searchInputEl.dispatchEvent(evt);

      setTimeout(() => {
        clickProjectDropDownOption(searchInputEl);
      }, 1500);
    }, 100);
  }

  // (project -step 3) click on the selected option item, then continue with the next row
  function clickProjectDropDownOption(searchInputEl) {
    var optionSelector = document.querySelector(
      'li[title*="' + formValue.projectName + '"]'
    );
    searchInputEl.value = optionSelector.attributes.title.value;
    var evt = document.createEvent("Events");
    evt.initEvent("blur", true, true);
    searchInputEl.dispatchEvent(evt);
    setTimeout(() => {
      fillProjectNextRow();
    }, 200);
  }

  // (project -step 4) continue to the next row
  function fillProjectNextRow() {
    projectCurrentIndex++;
    openProjectDropDown(projectSearchInputRows[projectCurrentIndex]);
  }
}
