
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
      x.onclick = 'delete_rule('+i.toString()+')';
      rule.appendChild(ruleText);
      rule.appendChild(x);
      li.appendChild(rule);
      ol.appendChild(li);
    }
  }
});

function delete_rule(i) {
  chrome.storage.sync.get({
    rules: [],
  }, function (items) {
    let newItems = items.rules;
    newItems.splice(i, 1);
    chrome.storage.sync.set({
      rules: newItems,
    }, function () {
      alert("Done");
    });
  });
}

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
      newItems.push({
        text: newText,
        colour: newColour,
        domain: newDomain,
      });
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