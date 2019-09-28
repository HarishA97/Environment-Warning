


let url = window.location.href;

chrome.storage.sync.get({
    rules: []
}, function(items) {

    console.log(items);
    for( let i = 0; i < items.rules.length; i++ )
    {
        let domain = items.rules[i].domain;
        if (url.match(domain)) {
            let text = items.rules[i].text;
            let colour = items.rules[i].colour;

            let banner = document.createElement("div");

            const firstChild = document.body.firstChild;
            document.body.insertBefore(banner,firstChild);

            banner.style.cssText = 'height: 25px; width: 100%; background-color: '+colour+';text-align: center; position: fixed;';
            banner.innerText=text;
        }
    }
});