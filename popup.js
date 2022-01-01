document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        //alert('updated from contentscript');
    })

    function restrictNumber(e) {
        var newValue = this.value.replace(new RegExp(/[^\d]/, 'ig'), '')
        this.value = newValue
    }

    function restrictValue(e) {
        var valueMin = Number(e.target.getAttribute('min'))
        var valueMax = Number(e.target.getAttribute('max'))
        this.value =
            this.value > valueMax ?
            valueMax :
            this.value < valueMin ?
            valueMin :
            this.value
        return this.value
    }

    function autoFocusNextField(e) {
        var nextFocusElementId = e.target.getAttribute('next-focus')
        var maxLength = Number(e.target.getAttribute('maxlength'))
        if (nextFocusElementId) {
            var nextFocusEl = document.querySelector(`#${nextFocusElementId}`)
            if (this.value.length === maxLength) {
                nextFocusEl.focus()
            }
        }
    }

    function setTowNumbers(e) {
        if (e.value.length === 1) {
            e.value = `0${e.value}`
        }
    }

    var inputHoursEntry = document.querySelector('#entry_hours')
    var inputMinutesEntry = document.querySelector('#entry_minutes')
    var inputHoursExit = document.querySelector('#exit_hours')
    var inputMinutesExit = document.querySelector('#exit_minutes')
    var inputsAll = document.querySelectorAll('.input-item')
    var autoFillButton = document.querySelector('#auto_fill_btn')

    inputsAll.forEach((item) => {
        item.addEventListener('input', restrictNumber)
        item.addEventListener('input', restrictValue)
        item.addEventListener('input', autoFocusNextField)
    })

    autoFillButton.addEventListener('click', async () => {
        let [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        })

        inputsAll.forEach((item) => {
            setTowNumbers(item)
        })

        chrome.storage.sync.set({
            popupFormValue: {
                entryHours: inputHoursEntry.value || '00',
                entryMinutes: inputMinutesEntry.value || '00',
                exitHours: inputHoursExit.value || '00',
                exitMinutes: inputMinutesExit.value || '00',
            },
        })
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
            },
            function: init,
        })
    })
})

function init() {
    var formValue;
    chrome.storage.sync.get('popupFormValue', function({
        popupFormValue
    }) {
        formValue = popupFormValue
        clickErrorButton()
        setTimeout(() => fillTime(), 2000)
    })

    function fillTime() {
        document.querySelectorAll('input[id*="ManualEntry"]').forEach((item) => {
            if (item.value == '') {
                item.value = `${formValue.entryHours}:${formValue.entryMinutes}`
            }
            var event = new Event('blur', {
                bubbles: true,
                cancelable: true,
            })
            item.dispatchEvent(event)
        })
        document.querySelectorAll('input[id*="ManualExit"]').forEach((item) => {
            if (item.value == '') {
                item.value = `${formValue.exitHours}:${formValue.exitMinutes}`
            }
            var event = new Event('blur', {
                bubbles: true,
                cancelable: true,
            })
            item.dispatchEvent(event)
        })
    }

    function clickErrorButton() {
        var errorDaysButton = document.querySelector(
            'input[id*="RefreshErrorsDays"]',
        )
        errorDaysButton.click()
    }
}