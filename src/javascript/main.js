// define global functions
let shareID = null
let publicUrlShareActive = false
publicSubscribeActive = false
let XHost = "http://localhost"

// The ID of the extension
// let editorExtensionId = "bcjeaeloapgoghamfccokbdmojknnjif";
let editorExtensionId = "albdahjdcmldbcpjmbnbcbckgndaibnk";

window.onload = triggerOnLoad

function triggerOnLoad () {

  const urlParams = new URLSearchParams(window.location.search);
  let queryText = urlParams.get("q");
  shareID = urlParams.get("share");
  if (shareID != null && shareID.trim() === "") {
    shareID = null
  }

  // trigger search if query param is found
  if (queryText != null && queryText.trim() != "") {
    document.querySelector(".cleartxt").classList.remove("hidden");
    queryText = queryText.trim()
    document.querySelector(".js-userinput").value = queryText;
    searchDocs(queryText, new Date());
  }
  else {
    if (document.querySelector(".cleartxt")) {
      document.querySelector(".cleartxt").classList.add("hidden");
      listDocs(new Date());
    }
  }

  // Is user logged in?
  
  // render user profile
  renderUserLoggedIN()

  // render public url
  updatePublicURLStatus()
  updatePublicSubscribeStatus()
};

if (document.querySelector(".js-go")) {
  document.querySelector(".js-go").addEventListener("click", function () {
    let userInput = getUserInput();
    if (userInput != null && userInput.trim() != "") {
      searchDocs(userInput, new Date());
    }
    else {
      listDocs(new Date());
    }
  });
}

if (document.querySelector(".cleartxt")) {
  document.querySelector(".cleartxt").addEventListener("click", function () {
    el = document.querySelector(".js-userinput")
    el.value = null;
    // el.dispatchEvent(new Event('focus'));
    // el.dispatchEvent(new KeyboardEvent('keypress',{'key':'13'}));
    document.querySelector(".cleartxt").classList.add("hidden");
    // listDocs(new Date());
    window.stop()
  });
}

if (document.querySelector(".js-userinput")){
  document.querySelector(".js-userinput").addEventListener("keyup", function (data) {
    let userInput = getUserInput();
    if (userInput.trim() != "") {
      document.querySelector(".cleartxt").classList.remove("hidden");
    }
    else {
      document.querySelector(".cleartxt").classList.add("hidden");
    }

    if (data.which === 13) {
      if (userInput != null && userInput.trim() != "") {
        searchDocs(userInput, new Date());
      }
      else {
        listDocs(new Date());
      }
    }
  });
}

function getUserInput() {
  let inputValue = document.querySelector(".js-userinput").value;

  return inputValue;
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(XHost + url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });

  if (response.status != 200) {
    return {
      "success": false
    };
  }
  else {
    return response.json(); // parses JSON response into native JavaScript objects
  }
}

function getUserSecret (cbk_fn) {
  try {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage(editorExtensionId, {},
        function(response) {
          if (response && response.success) {
            cbk_fn(response.key);
          }
          else {
            cbk_fn(localStorage.getItem("axapi"));
          }
        }
      );
    }
    else {
      cbk_fn(localStorage.getItem("axapi"));
    }
  }
  catch(e) {
    cbk_fn(localStorage.getItem("axapi"));
  }
}

function makeRequest (url, dataIn, startTime, callbackFn, auth=false) {
  // Make a simple request
  let userLoggedIn = false

  // if (shareID != null) {
  //   dataIn.publicIndexId = shareID;
  // }
  
  if (auth) {
    getUserSecret ((ukey) => {
      if (ukey == null) {
        dataIn.database = "2trgASV2PQXkFcW5PHR6HTdnShKPvZsM24p1TWNhLNaK";
      }
      else {
        dataIn.key = ukey;
        userLoggedIn = true
      }

      // perform API call
      postData(url, dataIn)
      .then(data => {
        callbackFn(data, startTime, userLoggedIn);
      });
    })
  }
  else {
    // perform API call
    postData(url, dataIn)
    .then(data => {
      callbackFn(data, startTime, userLoggedIn);
    });
  }
}

function searchDocs(searchQuery, startTime) {
  // update url history
  window.history.pushState('', '', '/?q='+searchQuery.replace(/ +(?= )/g,'').split(" ").join("+"));
  if (shareID != null) {
    window.history.pushState('', '', '/?q='+searchQuery.replace(/ +(?= )/g,'').split(" ").join("+")+'&share='+shareID);
  }

  let url = "/api/search";
  let dataIn = { query: searchQuery };

  // public search needed??
  needAuth = true;
  if (shareID != null) {
    dataIn.publicIndexId = shareID;
    needAuth = false;
  }

  // Make a simple request:
  makeRequest(url, dataIn, startTime, pushSearchResultsToDOM, needAuth);
}

function listDocs(startTime) {
  // update url history
  window.history.pushState('', '', '/');
  if (shareID != null) {
    window.history.pushState('', '', '/?share='+shareID);
  }

  let url = "/api/list";

  dataIn = {
    "page": "0",
    "limit": "100"
  }

  // public listing needed??
  needAuth = true;
  if (shareID != null) {
    dataIn.publicIndexId = shareID;
    needAuth = false;
  }

  // Make a simple request:
  makeRequest(url, dataIn, startTime, pushListResultsToDOM, needAuth);
}

function pushSearchResultsToDOM(response, startTime, userLoggedIn=false) {
  if (response && response.result) {
    response = response.result

    // time elapsed
    endTime = new Date();
    let timeDiff = endTime - startTime;
    timeDiff /= 1000;

    // find the container to hold this stuff in DOM
    let container = document.querySelector(".js-container");
    // clear it of old content since this function will be used on every search
    // we want to reset the div
    container.innerHTML = ""
    container.innerHTML += '<p class="text-sm text-gray-600 py-2"> Received '+Object.keys(response).length+' results in '+timeDiff+' seconds.</p>';

    // sort results
    const sortable = Object.entries(response)
      .sort(([,a],[,b]) => b-a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    urllist = []

    // loop through data array and add IMG html
    for (const key in sortable) {
      // find img src
      let src = key;
      let rootUrl = src;
      try {
        rootUrl = (new URL(src)).hostname;
      }
      catch(err) {
        // rootUrl = src;
      }

      // update url list
      urllist.push(src)

      // concatenate a new url
      container.innerHTML += "<a rel='nofollow' unique_id='" + btoa(src) + "' href='" + src + "' class='border rounded p-4 hover:bg-gray-50 hover:shadow' target='_blank'> \
            <p class='text-blue-500 text-xl'>"+rootUrl+"</p> \
            <p class='pt-2 text-xs text-green-600 font-thin truncate ...'>"+src+"</p></a>";
            // <p class='font-bold pt-2 text-1xl text-gray-500'>score: "+Math.round(100*response[key])+"</p> \
    }

    // update blocks with more info
    updateBlockSummary (urllist)
  }
}

function pushListResultsToDOM(response, startTime, userLoggedIn=false) {
  if (response && response.result) {
    response = response.result

    // time elapsed
    endTime = new Date();
    let timeDiff = endTime - startTime;
    timeDiff /= 1000;

    // find the container to hold this stuff in DOM
    let container = document.querySelector(".js-container");
    // clear it of old content since this function will be used on every search
    // we want to reset the div
    container.innerHTML = ""
    container.innerHTML += '<p class="text-sm text-gray-600 py-2"> Received '+response.links.length+' results in '+timeDiff+' seconds.</p>';

    // sort results
    response.links.sort(function(a, b) {
      let keyA = a.timestamp,
        keyB = b.timestamp;
      // Compare the 2 dates
      if (keyA < keyB) return 1;
      if (keyA > keyB) return -1;
      return 0;
    });

    urllist = []

    // loop through data array and add IMG html
    response.links.forEach(function (link) {
      // find img src
      let src = link.url;
      let rootUrl = src;
      try {
        rootUrl = (new URL(src)).hostname;
      }
      catch(err) {
        // rootUrl = src;
      }
      let dtime = new Date(link.timestamp * 1000);

      // update url list
      urllist.push(src)

      // concatenate a new url
      container.innerHTML += "<a rel='nofollow' unique_id='" + btoa(src) + "' href='" + src + "' class='border rounded p-4 hover:bg-gray-50 hover:shadow' target='_blank'> \
            <p class='text-blue-500 text-xl'>"+rootUrl+"</p> \
            <p class='pt-2 text-gray-500 text-sm'>updated "+moment(dtime).fromNow()+"</p> \
            <p class='pt-2 text-xs text-green-600 font-thin truncate ...'>"+src+"</p></a>";
    });

    // update blocks with more info
    updateBlockSummary (urllist)
  }
}

function updateBlockSummary (urls) {
  let url = "/api/urlsummary";

  dataIn = {
    "urls": urls.filter(onlyUnique)
  }

  // public summary needed??
  needAuth = true;
  if (shareID != null) {
    dataIn.publicIndexId = shareID;
    needAuth = false;
  }

  // Make a simple request:
  makeRequest(url, dataIn, new Date(), pushListBlockSummaryToDOM, needAuth);
}

function pushListBlockSummaryToDOM(summary, startTime, userLoggedIn=false) {
  // truncate summary
  let trLength = 300

  summary.result.summary.forEach(function (summ) {
    let elements = document.querySelectorAll("[unique_id=\""+btoa(summ.url)+"\"]");

    let index = 0, elength = elements.length;
    for ( ; index < elength; index++) {
      element = elements[index]

      if (summ.title != null && summ.title.trim() != "") {
        element.children[0].innerText = summ.title;
      }
      if (summ.summary != null && summ.summary.trim() != "") {
        let tag = document.createElement("p");
        let text = document.createTextNode(summ.summary.substring(0,trLength)+"...");
        tag.appendChild(text);
        // tag.classList.add("hidden");
        tag.classList.add("pt-2");
        tag.classList.add("pr-5");
        tag.classList.add("pl-3");
        tag.classList.add("text-sm");
        tag.classList.add("font-thin");
        
        element.appendChild(tag);
      }
      if (summ.author != null && summ.author.trim() != "") {
        let tag = document.createElement("p");
        let text = document.createTextNode("- "+summ.author);
        tag.appendChild(text);
        // tag.classList.add("hidden");
        tag.classList.add("pt-2");
        tag.classList.add("pl-3");
        tag.classList.add("text-sm");
        tag.classList.add("font-bold");
        tag.classList.add("text-gray-500");
        
        element.appendChild(tag);
      }
    }
  });
}

function copyPublicURL() {
  /* Get the text field */
  let copyText = document.getElementById("copyPublicURLinp");
  let copyButton = document.getElementById("copyPublicURLButton");

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 99999); /* For mobile devices */

  /* Copy the text inside the text field */
  document.execCommand("copy");

  /* Alert the copied text */
  copyButton.innerText = "copied"
} 

function renderUserLoggedIN () {
  let url = "/api/user";
  let dataIn = {}
  makeRequest(url, dataIn, new Date(), (response, startTime, userLoggedIn=false) => {
    if (response.success) {
      userData = response.user[0]
      document.querySelector('#usernameDisplay').innerText = userData.name;
      avatarConstruct = (userData.name + " _ _").toUpperCase().split(" ")
      document.querySelector('#userAvatarDisplay').innerText = avatarConstruct[0][0]+avatarConstruct[1][0];
    }

    // show only when a user id is used for login (not public)
    if (userLoggedIn) {
      document.querySelector('#usernameDisplayContainer').classList.remove("hidden");
    }
    else {
      document.querySelector('#usernameDisplayCreate').classList.remove("hidden");
    }
  }, auth=true);
} 

function getPublicURLStatus(cbk) {
  let url = "/api/url/public";
  let dataIn = {}

  // authentication needed??
  needAuth = true;
  if (shareID != null) {
    dataIn.publicIndexId = shareID;
    needAuth = false;
  }

  if (needAuth) {
    makeRequest(url, dataIn, new Date(), cbk, auth=needAuth);
  }
} 

function updatePublicURLStatus() {
  getPublicURLStatus((response, startTime, userLoggedIn=false) => {
    if (response.success) {
      publicUrlData = response.publicIndexId[0]
      if (publicUrlData.isActive > 0) {
        publicUrlShareActive = true
        document.querySelector('#copyPublicURLinp').value = XHost + "/?share=" + publicUrlData.id;
      }
      else {
        publicUrlShareActive = false
        document.querySelector('#copyPublicURLinp').value = XHost;
      }
      renderPublicUrl(publicUrlShareActive)
    }
  });
}

function updatePublicSubscribeStatus() {
  let url = "/api/subscribe/check";
  let dataIn = {}

  // authentication needed??
  needAuth = false;
  if (shareID != null) {
    dataIn.publicIndexId = shareID;
    needAuth = true;
  }

  if (needAuth) {
    makeRequest(url, dataIn, new Date(), (response, startTime, userLoggedIn=false) => {
      publicSubscribeActive = false
      document.querySelector('#copyPublicURLinp').value = XHost + "/?share=" + shareID;

      if (response.success) {
        publicSubData = response.isSubscribed
        if (publicSubData.length > 0) {
          publicSubscribeActive = true
          document.querySelector('#copyPublicURLinp').value = XHost + "/?share=" + publicSubData[0].publicIndexId;
        }
      }
      
      // render subscribe button
      renderPublicSubscribe(publicSubscribeActive)
    }, auth=needAuth);
  }
} 

function renderPublicUrl (active) {
  // show share button because user is logged in
  document.querySelector('#shareButtonPlacer').classList.remove("hidden");
  document.querySelector('#togglePublicURLButton').classList.remove("hidden");

  if (active) {
    // show share url input
    document.querySelector('#copyPublicURLdiv').classList.remove("hidden");
    document.querySelector('#togglePublicURLButton').innerHTML = "Unshare";
    document.querySelector('#togglePublicURLButton').classList.remove("bg-green-400");
    document.querySelector('#togglePublicURLButton').classList.add("bg-red-400");
  }
  else {
    // show share url input
    document.querySelector('#copyPublicURLdiv').classList.add("hidden");
    document.querySelector('#togglePublicURLButton').innerHTML = "Share";
    document.querySelector('#togglePublicURLButton').classList.remove("bg-red-400");
    document.querySelector('#togglePublicURLButton').classList.add("bg-green-400");
  }
}

function renderPublicSubscribe (active) {
  // show share url input
  document.querySelector('#copyPublicURLdiv').classList.remove("hidden");
  // show subscribe button
  document.querySelector('#subscribeButtonPlacer').classList.remove("hidden");
  document.querySelector('#togglePublicSubscribeButton').classList.remove("hidden");

  if (active) {
    document.querySelector('#togglePublicSubscribeButton').innerHTML = "Unsubscribe";
    document.querySelector('#togglePublicSubscribeButton').classList.remove("bg-yellow-500");
    document.querySelector('#togglePublicSubscribeButton').classList.add("bg-gray-400");
  }
  else {
    document.querySelector('#togglePublicSubscribeButton').innerHTML = "+ Subscribe";
    document.querySelector('#togglePublicSubscribeButton').classList.remove("bg-gray-400");
    document.querySelector('#togglePublicSubscribeButton').classList.add("bg-yellow-500");
  }
}

function togglePublicURL() {
  getPublicURLStatus((response, startTime, userLoggedIn=false) => {
    if (response.success) {
      console.log(response)
      publicUrlData = response.publicIndexId[0]

      // Toggle value
      publicUrlShareActive = !publicUrlShareActive
      
      let url = "/api/url/public/status";
      let dataIn = {
        "publicIndexId": publicUrlData.id
      }
      if (publicUrlShareActive) {
        dataIn.isActive = 1
      }
      else {
        dataIn.isActive = 0
      }

      makeRequest(url, dataIn, new Date(), (response, startTime, userLoggedIn=false) => {
        if (response.success) {
          updatePublicURLStatus()
        }
      }, auth=true);
    }
  });
}

function togglePublicSubscribe() {
  // Toggle value
  publicSubscribeActive = !publicSubscribeActive
  
  let url = "/api/subscribe";
  let dataIn = {
    "publicIndexId": shareID
  }
  if (!publicSubscribeActive) {
    url = "/api/subscribe/delete";
  }

  makeRequest(url, dataIn, new Date(), (response, startTime, userLoggedIn=false) => {
    if (response.success) {
      updatePublicSubscribeStatus()
    }
    else {
      window.open("https://aquila.network/index.html#form9-3","_self")
    }
  }, auth=true);
}
