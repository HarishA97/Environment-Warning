
let url = window.location.href;

chrome.storage.sync.get({
    rules: []
}, function(items) {

    for( let i = 0; i < items.rules.length; i++ )
    {
        let domain = items.rules[i].domain;
        if (url.match(domain)) {
            let text = items.rules[i].text;
            let colour = items.rules[i].colour;

            let banner = document.createElement("div");
            banner.id = "environmentWarning";
            banner.innerText = text;

            let close = document.createElement("a");
            close.id = "closeBanner";
            close.href = "javascript:document.getElementById(\"environmentWarning\").remove();";
            close.innerText = "[x]";

            banner.appendChild(close);

            const firstChild = document.body.firstChild;
            document.body.insertBefore(banner,firstChild);

            banner.style.cssText = 'height: 25px; width: 100%;z-index: 9999; background-color: '+colour+';text-align: center; position: fixed;';
        }
    }
});