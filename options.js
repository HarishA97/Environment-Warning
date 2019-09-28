
chrome.storage.sync.get({
  rules: [],
}, function (items) {
  if(items) {
    const ol = document.getElementById("currentRules");

    for( let i = 0; i < items.rules.length; i++ )
    {
      let o = items.rules[i].text;
      let li = document.createElement("li");
      let rule = document.createElement("div");
      let ruleText = document.createTextNode(o);
      let x = document.createElement("a");
      x.innerText = "[x]";
      rule.appendChild(ruleText);
      rule.appendChild(x);
      li.appendChild(rule);
      ol.appendChild(li);
    }
  }
});

function save_options() {
  let newText = document.getElementById('text').value;
  let newColour = document.getElementById('colour').value;
  let newDomain = document.getElementById('domain').value;

  chrome.storage.sync.get({
    rules: [],
  }, function (items) {
    if (!items) {
      chrome.storage.sync.set({
        rules: [{
          text: newText,
          colour: newColour,
          domain: newDomain,
        }],
      }, function () {
        alert("Done");
      });
    }else {
      let newItems = items.rules;
      alert(newItems);
      newItems.push({
        text: newText,
        colour: newColour,
        domain: newDomain,
      });
      alert("Waiting");
      chrome.storage.sync.set({
        rules: newItems,
      }, function () {
        alert("Done");
      });
    }
  });
}

function clear_options() {
  chrome.storage.sync.set({
    rules: [],
  }, function () {
    alert("Done");
  });
}

document.getElementById('submit').addEventListener('click',
    save_options);
document.getElementById('clear').addEventListener('click',
    clear_options);