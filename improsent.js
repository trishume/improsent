var handlers = {};
var history = [];
var curHistItem = 0;

// ========================================
// Image
// ========================================

google.load('search', '1');
function displayImageHandler(resultElement,query) {
  // Grab our content div, clear it.
  var newImg = document.createElement('img');
  // There is also a result.url property which has the escaped version
  newImg.src = query;
  // Put our title + image in the content
  resultElement.innerHTML = '';
  resultElement.appendChild(newImg);
}
function imageSearchHandlerSize(size) {
  return function(resultElement,query) {
    var imageSearch = new google.search.ImageSearch();
    // Restrict to extra large images only
    imageSearch.setRestriction(google.search.ImageSearch.RESTRICT_IMAGESIZE,
                               size);
    imageSearch.setRestriction(google.search.Search.RESTRICT_SAFESEARCH,
                                google.search.Search.SAFESEARCH_STRICT);
    imageSearch.setResultSetSize(8);
    
    // Here we set a callback so that anytime a search is executed, it will call
    // the function and pass it our ImageSearch searcher.
    // When a search completes, our ImageSearch object is automatically
    // populated with the results.
    imageSearch.setSearchCompleteCallback(this, function() {
      if (imageSearch.results && imageSearch.results.length > 0) {
        console.log(imageSearch.results);
        // Grab our content div, clear it.
        var newImg = document.createElement('img');
        // to keep track of which image we are on
        var curResult = 0;
        function nextImage() {
          curResult++;
          newImg.src = imageSearch.results[curResult].unescapedUrl;
        }
        // There is also a result.url property which has the escaped version
        newImg.src = imageSearch.results[curResult].unescapedUrl;
        // If it fails to load get the next one
        newImg.onerror = nextImage;
        // Add a next handler
        handlers["ni"] = nextImage;
      
        // Put our title + image in the content
        resultElement.innerHTML = '';
        resultElement.appendChild(newImg);
      }
    }, null);
    
    imageSearch.execute(query);
  }
}

// ========================================
// Slab text
// ========================================

function slabTextHandler(resultElement,query) {
  var newHeader = document.createElement('h1');
  newHeader.className = "slabHeading";
  
  if(query.indexOf(", ") != -1) {
    var stS = "<span class='slabtext'>",
      stE = "</span>",
      txt = query.toUpperCase().split(", ");
    newHeader.innerHTML = stS + txt.join(stE + stS) + stE;
  } else {
    newHeader.innerHTML = query.toUpperCase();
  }
  
  resultElement.innerHTML = '';
  resultElement.appendChild(newHeader);
  
  // slab it
  $(".slabHeading").slabText();
}

// ========================================
// Slide module
// ========================================

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function capitaliseFirst(string){
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function getHeadingHandler(bodyElem) {
  return function(resultElement,query) {
    var newHeader = document.createElement('h1');
    newHeader.className = "slideHeading";
    newHeader.innerHTML = toTitleCase(query);
    
    var newList = document.createElement(bodyElem);
    newList.id = "slideList";
    
    resultElement.innerHTML = '';
    resultElement.appendChild(newHeader);
    resultElement.appendChild(newList);
  }
}

function bulletHandler(resultElement,query) {
  var list = document.getElementById("slideList");
  if(!list) return false;
  
  var newBullet = document.createElement('li');
  newBullet.className = "slideBullet";
  newBullet.innerHTML = capitaliseFirst(query);
  
  list.appendChild(newBullet);
  MathJax.Hub.Typeset()
}

function mathHandler(resultElement,query) {
  var newHeader = document.createElement('h1');
  newHeader.innerHTML = "$$$" + query + "$$$";
  newHeader.className = "mathEquation";
  
  resultElement.innerHTML = '';
  resultElement.appendChild(newHeader);
  MathJax.Hub.Typeset()
}

// ========================================
// Wiki module
// ========================================

function searchWikipediaAPI(query,callback) {
  $.getJSON('http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?', {search:query},callback);
}

function callWikipediaAPI(wikipediaPage,callback) {
	// http://www.mediawiki.org/wiki/API:Parsing_wikitext#parse
  $.getJSON('http://en.wikipedia.org/w/api.php?action=parse&format=json&callback=?', {page:wikipediaPage, prop:'text|displaytitle', uselang:'en'},callback);
}

function wikiDescriptHandler(resultElement,query) {
  function wikipediaHTMLResult(data) {
    console.log(data);
    var readData = $('<div>' + data.parse.text['*'] + '</div>');

    // handle redirects
    var redirect = readData.find('li:contains("REDIRECT") a').text();
    if(redirect != '') {
    	callWikipediaAPI(redirect,wikipediaHTMLResult);
        return;
    }
    
    // make the element
    var newHeader = document.createElement('h1');
    newHeader.className = "slideHeading";
    newHeader.innerHTML = data.parse.displaytitle;
    
    var body = document.createElement('p');
    body.className = "wikiText";
    body.innerHTML = readData.find('p')[0].innerHTML;
    
    resultElement.innerHTML = '';
    resultElement.appendChild(newHeader);
    resultElement.appendChild(body);
  };
  function wikipediaSearchResult(data) {
    var results = data[1];
    if(results.length < 1) return;
    callWikipediaAPI(results[0],wikipediaHTMLResult);
  }
  // get the page description
  searchWikipediaAPI(query,wikipediaSearchResult);
}

// ========================================
// Loading Module
// ========================================

var showSlides = null;
var curSlide = 0;
filepicker.setKey('AQxA1QKbnTAOp3Uy8n35fz'); // filepicker.io api key
function loadShowHandler(resultElement,query) {
  function loadShow(data) {
    curSlide = 0;
    showSlides = data.slides;
    nextSlideHandler(null,null);
  }
  // if a predefined show is not provided get it from the user
  if(query == '') {
    // load from filepicker.io
    filepicker.getFile(['text/*','application/json'], function(url){
      // download the file contents
      filepicker.getContents(url, function(data){
        loadShow(JSON.parse(data));
      });
    });
    return;
  }
  $.getJSON('shows/'+query+'.json?' + Math.random(), loadShow);
}
function nextSlideHandler(resultElement,query) {
  if(!showSlides) return;
  var slide = showSlides[curSlide];
  if(!slide) return;
  curSlide++;
  if (!(slide instanceof Array)) {
    slide = slide.split(";");
  }
  // perform multiple commands in sequence
  for(var i = 0; i < slide.length; i++) {
    var command = slide[i];
    performQuery(command);
  }
}

function saveShowHandler(resultElement,query) {
  // remove the save command from the history
  history.pop();
  // generate json
  var jsonText = JSON.stringify({slides:history});
  // get temp url with filepicker.io
  var name = query == '' ? 'myShow' : query;
  filepicker.getUrlFromData(jsonText,
    function(url, data) {
        // open a filepicker.io save box
        filepicker.saveAs(url, 'application/json', {'defaultSaveasName': name + '.impro'}, function(FPUrl){})
  });
}

function clearHistHandler(resultElement,query) {
  history = [];
}


// ========================================
// Customization
// ========================================

function bgColourHandler(resultElement,query) {
  document.body.style.background = query;
}

// ========================================
// MAIN CODE
// ========================================

function querySubmitted() {
  var queryField = document.getElementById("searchQuery");
  var query = queryField.value;
  // add to history
  history.push(query);
  curHistItem = history.length; // reset history scrollback
  var querys = query.split(";");
  // clear the field
  queryField.value = "";
  
  for(var i = 0; i < querys.length; i++) {
    performQuery(querys[i]);
  }
}

function performQuery(query) {
  // get the command
  var parts = query.split(' ');
  if(parts.length < 1) {
    console.log("no parts");
    return false;
  }
  var command = parts.shift();
  // look up the correct function
  var handler = handlers[command];
  if(!handler) {
    console.log("Can't find handler for " + command);
    console.log(handlers);
    return false;
  }
  // call it
  var result = document.getElementById("content");
  var args = parts.length < 1 ? "" : parts.join(" ");
  handler(result,args);
  return false;
}

// up arrow key history scrollback
function handleFieldKey(e) {
  if(e.keyCode==38) {
    if(!history[curHistItem-1]) return true;
    document.getElementById("searchQuery").value = history[curHistItem-1];
    curHistItem -= 1;
    return false;
  }
  return true;
}

function OnLoad() {
  handlers = {
    "iu":displayImageHandler,
    "i":imageSearchHandlerSize(google.search.ImageSearch.IMAGESIZE_MEDIUM),
    "il":imageSearchHandlerSize(google.search.ImageSearch.IMAGESIZE_LARGE),
    "image":imageSearchHandlerSize(google.search.ImageSearch.IMAGESIZE_MEDIUM),
    "st":slabTextHandler,
    "s":slabTextHandler,
    "t":slabTextHandler,
    "h":getHeadingHandler('ul'),
    "ho":getHeadingHandler('ol'),
    "b":bulletHandler,
    "eq":mathHandler,
    "w":wikiDescriptHandler,
    "play":loadShowHandler,
    "save":saveShowHandler,
    "clearhist":clearHistHandler,
    "n":nextSlideHandler,
    "bg":bgColourHandler
  }
  document.getElementById("searchQuery").focus();
  
  var url = location.href;
  if(url.indexOf("?") != -1) {
    var hash = url.substring(url.indexOf("?")+1);
    if(hash != '') performQuery("play " + hash);
  }
}

google.setOnLoadCallback(OnLoad);