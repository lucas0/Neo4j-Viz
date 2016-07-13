var width = 600,
    height = 600;

var nodeCounter = 0;
var linkCounter = 0;
var queryWords = [];
var sentencesInserted = [];

function reqWord(wordUrl){
  var name = '';
  $.ajax({
    url: wordUrl,
    accepts: "application/json; charset=UTF-8",
    contentType: "application/json; charset=utf-8",
    type:"GET",
    async: false,
    success:function(result,xhr,status)
    {
        name = result.data.word;
        if (name == undefined){
          name = result.data.name;
        }
    },
    error:function(xhr,err,msg){
        console.log(xhr);
        console.log(err);
        console.log(msg);
    }
  });
  return name;
}
function getPath(data){
  var string = '';
  data.nodes.forEach(function(node, index) {
    palavra = reqWord(node);
    string += node+" "+palavra+" ";
    if (index < data.directions.length){
        string += data.directions[index]+"\n";
    }
  })
  return string;
}

function neighbours(id){
  return;
  var post_data = {"statements":[{"statement":"MATCH p=((p1:Word)-[r*0..2]-(p2:Word)) WHERE id(p1) = "+id+" RETURN p1,p2,p AS Path, length(p) AS PathSize ORDER BY PathSize",
  				         "resultDataContents":["graph"]}]};
  var nData;
  $.ajax({
      url: "http://mydomain.com:7474/db/data/transaction/commit",
      contentType: 'application/json',
      accept: 'application/json; charset=UTF-8',
      data: JSON.stringify(post_data),
      type:"POST",
      async: false,
      success:function(result,xhr,status)
      {
          nData = result;
      },
      error:function(xhr,err,msg){
          console.log(xhr);
          console.log(err);
          console.log(msg);
      }
    });
    return nData;
}

function path(){
  var w1 = $("#w1").val().toLowerCase();
  var w2 = $("#w2").val().toLowerCase();
  var pathLimit = $("#w3").val().toLowerCase();
  var limit = $("#w4").val().toLowerCase();
  queryWords.push(w1);
  queryWords.push(w2);
  $("message").html("Processing, please wait...");

  var post_data = {"statements":[{"statement":"MATCH p=((p1:Word {word: '"+w1+"'})-[r*0.."+pathLimit+"]-(p2:Word {word:'"+w2+"'})) RETURN DISTINCT p1,p2,p AS Path, length(p) AS PathSize ORDER BY PathSize LIMIT "+limit,
  				         "resultDataContents":["graph"]}]};
  $.ajax({
      url: "http://mydomain.com:7474/db/data/transaction/commit",
      contentType: 'application/json',
      accept: 'application/json; charset=UTF-8',
      data: JSON.stringify(post_data),
      type:"POST",
      async: false,
      success:function(result,xhr,status)
      {
          forceGraphFromJSON(result);
      },
      error:function(xhr,err,msg){
          console.log(xhr);
          console.log(err);
          console.log(msg);
      }
    });
}//function path

//this is called as soon as the page is loaded
$(document).ready(function(){
  $("#w1").val("mother");
  $("#w2").val("birth");
  graph = new myGraph("body");
  contextSurf();
});

//click handler functions
var clickedOnce = false;
var timer;
function run_on_simple_click(data) {
    var id = data.id;
    alert("simpleclick on node: "+id);
    console.log(data)
    clickedOnce = false;
}
function run_on_double_click(data) {
    clickedOnce = false;
    clearTimeout(timer);
    console.log(data.id);
    nData = neighbours(data.id);
    graphs = nData.results[0].data;
    console.log(graphs.length);
    for(i = 0;i <graphs.length;i++){
        for(j = 0;j< graphs[i].graph.nodes.length;j++){
          var n =  graphs[i].graph.nodes[j];
          if (typeof (n.properties["name"]) == 'undefined'){
            n.properties.name = n.properties.word;
          }
          //if the node is not there already
          if(graph.findNode(n.id) == false){
            graph.addNode(n);
          }
        }
        for(j=0;j< graphs[i].graph.nodes.length;j++){
          var link = graphs[i].graph.relationships[j];
          if (typeof link != 'undefined'){
            graph.addLink(link,link.startNode,link.endNode);
          }
        }
    }
}

//creates a graph and defines all the functions to add/remove nodes/relations
function myGraph(el) {

    // Initialise the graph object
    var graph = this.graph = {
        "nodes":[],
        "links":[]
    };

    // Add and remove elements on the graph object
    this.addNode = function (node) {
        if(!this.findNode(node.id)){
          graph["nodes"].push(node);
          update();
        }
    }

    this.clearNodes = function(){
      graph["nodes"] = [];
      graph["links"] = [];
      update();
      d3.select("svg").selectAll("*").remove();
      queryWords = [];
      sentencesInserted = [];
      update();
    }

    this.removeNode = function (id) {
      graph["nodes"] = _.filter(graph["nodes"], function(node) {return (node["vizID"] != id)});
      graph["links"] = _.filter(graph["links"], function(link) {return ((link["source"]["id"] != id)&&(link["target"]["id"] != id))});
      update();
    }

    this.findNode = function (id) {
      id = id.toString();
      for (var i in graph["nodes"]){
         nodeId = graph["nodes"][i]["id"].toString();
         if (nodeId === id){
           return graph["nodes"][i];
         }
      }
      return false;
    }

    this.addLink = function (link,sourceId,targetId) {
      number_of_links = graph["links"].length;
      for (index = 0; index< number_of_links;index++){
        if (graph["links"][index].id == link.id){
          //console.log(sourceId+link.type+targetId+"not added.");
          return;
        }
      }
      //console.log(link);
      //console.log("LINK ADICIONANDO: "+sourceId+" -> "+targetId);
      link["source"] = this.findNode(sourceId);
      link["target"] = this.findNode(targetId);
      graph["links"].push(link);
      update();
    }

    // set up the D3 visualisation in the specified element
    var w = $(el).innerWidth(),
        h = $(el).innerHeight();

    var vis = d3.select(el).append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    var force = d3.layout.force()
        .nodes(graph.nodes)
        .links(graph.links)
        .charge(-700)
        //.gravity(.05)
        .distance(150)
        .size([w, h]);

    var update = function () {
        d3.select("svg").selectAll("*").remove();
        nodeCounter = graph["nodes"].length;
        linkCounter = graph["links"].length;
        d3.select("#test1").text("#Nodes: "+nodeCounter+"  #Links: "+linkCounter);

        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            return "<strong>ID:</strong> <span style='color:red'>" + d.id + "</span>";
          })

        // Per-type markers, as they don't inherit styles.
        var svg = d3.select("body").select("svg");

        svg.call(tip);

        // build the arrow.
        svg.append("svg:defs").selectAll("marker")
            .data(["end"])      // Different link/path types can be defined here
          .enter().append("svg:marker")
            .attr("id", "end")    // This section adds in the arrows
            .attr("viewBox", "0 -5 10 10")
            .attr("refX",80)
            .attr("refY",0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
          .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");

        // add the links and the arrows
        var pg = svg.append("svg:g").selectAll("path")
            .data(force.links())
          .enter().append("g");

        var path = pg.append("path")
            .attr("class", "link")
            .attr("marker-start", "url(#end)")

        var text = pg.append("text")
          .data(force.links())
          .attr("dx",10)
          .attr("dy",10)
        	.text(function(d){return d.type;})
        	.style("fill", "black");

        var node = vis.selectAll("g.node")
            .data(graph.nodes);

        node.enter().append("g")
            .attr("class", "node")
            .call(force.drag);

        node.append("circle")
            .attr("class", "node")
            .attr("r", 10)
            .style("fill", function(d) {
              if (d.labels.includes("HeadWord")){return "purple";};
              if (d.labels.includes("DefWord")){return "green";}
              else{return "red";};
            })
            .on('click', function(d,i){
              if (clickedOnce) {
                  run_on_double_click(d);
              } else {
                  timer = setTimeout(function() {run_on_simple_click(d);}, 250);
                  clickedOnce = true;
              }
            })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .style("stroke", function(d){
                var wrd = d.properties.name;
                if (queryWords.indexOf(wrd) > -1){
                  return "orange";
                }
                return "black";
            })
            .style("stroke-width", function(d){
              var wrd = d.properties.name;
              if (queryWords.indexOf(wrd) > -1){
                return "5px";
              }
              return "1px";
            });

        node.append("text")
            .attr("class", "nodetext")
            .attr("dx",10)
            .attr("dy",5)
            .text(function(d) { return d.properties.name})
            .style("fill", "black")
            .style("stroke", "black")
            .style("stroke-width", 0.1);

        node.exit().remove();

        force.on("tick", function() {
          node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

          path.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(0); //defines the radius of the curvature of the link (was: dx * dx + dy * dy)
            return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
          });

          text.attr("transform", function(d) {
  	         return "translate(" + ((d.source.x + d.target.x)/2) + "," + ((d.source.y + d.target.y)/2) + ")"; });

        });

        // Restart the force layout.
        force
          .nodes(graph.nodes)
          .links(graph.links)
          .start();
    }

    // Make it all go
    update();
}
//inserts all the nodes of the sentence given a HeadWord
function insertSentence(sNum){
  var post_data = {"statements":[{"statement":"MATCH (n1)-[r]-(n2) WHERE (n1.sNum = '"+sNum+"') RETURN DISTINCT(n1), r",
  				         "resultDataContents":["graph"]}]};
  var nData;
  $.ajax({
      url: "http://mydomain.com:7474/db/data/transaction/commit",
      contentType: 'application/json',
      accept: 'application/json; charset=UTF-8',
      data: JSON.stringify(post_data),
      type:"POST",
      async: false,
      success:function(result,xhr,status)
      {
          nData = result;
      },
      error:function(xhr,err,msg){
          console.log(xhr);
          console.log(err);
          console.log(msg);
      }
    });

    //insert all nodes and relationships of the sentence

    results = nData.results[0].data
    for(var i = 0;i<results.length;i++){
      nNodes = results[i].graph.nodes;
      for(index = 0;index<nNodes.length;index++){
        var no = nNodes[index];
        if (typeof (no.properties["name"]) == 'undefined'){
          no.properties.name = no.properties.word;
        }
        graph.addNode(no);
      }
      link = results[i].graph.relationships[0];
      graph.addLink(link,link.startNode,link.endNode);
    }
    console.log("inserted sentence: ",sNum);
}
//start the graph with information retrieved from the query
function forceGraphFromJSON(json){
  //for each subgraph, creates a chain and adds it to the svg
  console.log("Number of Paths retrieved: ",json.results[0].data.length);
  for (var i= 0; i < json.results[0].data.length; i++){
    console.log("inserting subgraph number: ",i);
    subgraph = json.results[0].data[i].graph;
    nodes = subgraph.nodes;
    links = subgraph.relationships;
    for (var j = 0;j<nodes.length;j++){
        var n = nodes[j];
        if (typeof (n.properties["name"]) == 'undefined'){
          n.properties.name = n.properties.word;
        }
        if ((queryWords.indexOf(n.properties.name) > -1)&&(sentencesInserted.indexOf(n.properties.sNum) < 0)){
          console.log("insertingSentence for: "+n.properties.name);
          sentencesInserted.push(n.properties.sNum);
          insertSentence(n.properties.sNum);
        } else{
          graph.addNode(n);
        }
    }
    for (var j = 0;j<links.length;j++){
        var link = links[j];
        graph.addLink(link,link.startNode,link.endNode);
    }
  }
}

function clearSVG(){
  graph.clearNodes();
}

function wordsFromSameGloss(palavra_e_path, word2, restricted = false){
  var word1 = palavra_e_path[0];
  var restriction = "WHERE (n2.word <> '"+word1+"')";
  if (restricted) restriction = "WHERE (n2.word <> n1.word) AND ((n2.pos CONTAINS 'NN') OR (n2.pos CONTAINS 'VB'))";
  var post_data = {"statements":[{"statement":"MATCH (n1:HeadWord{word: '"+word1+"'})-[r*0..10]-(n2:Word) "+restriction+" RETURN DISTINCT(n2)",
  				         "resultDataContents":["graph"]}]};
  var nData;
  $.ajax({
      url: "http://mydomain.com:7474/db/data/transaction/commit",
      contentType: 'application/json',
      accept: 'application/json; charset=UTF-8',
      data: JSON.stringify(post_data),
      type:"POST",
      async: false,
      success:function(result,xhr,status)
      {
          nData = result;
      },
      error:function(xhr,err,msg){
          console.log(xhr);
          console.log(err);
          console.log(msg);
      }
    });

    //gets just the words (strings) of each node
    var results = nData.results[0].data
    var words = [];
    var sentences = [];
    for (var i = 0; i < results.length; i++){
      var node = results[i].graph.nodes[0];
      var word = node.properties.word;
      var sNum = node.properties.sNum;
      var path = palavra_e_path[1]+sNum.toString()+" ";
      if (word == word2) {
        path = path.substring(0, path.length - 1);
        sentences.push(path);
      } else {
        words.push([word, path]);
      }
    }

    return [words, sentences];
}

function deploy(){
  console.log("Deploy");
}

function contextSurf(){
  var w1 = $("#w1").val().toLowerCase();
  var w2 = $("#w2").val().toLowerCase();
  var loops = $("#w3").val().toLowerCase();
  var bagOfWords = [];
  var bagOfSentences = [];
  bagOfWords.push([w1,""]);
  for (var i =0;i<loops;i++){
    var addToWords = [];
    var addToSentences = [];
    for (var j in bagOfWords){
      console.log("Deepness: ",i, " word ",bagOfWords[j],". ",j," of ",bagOfWords.length);
      var results = wordsFromSameGloss(bagOfWords[j], w2, true);
      // bagOfWords = bagOfWords.splice(j, 1);//removes the element of the array.
      // console.log("words: ",results[0].length,". sentences: ",results[1].length);
      for (var d in results[0]) {addToWords.push(results[0][d]);}
      for (var e in results[1]) {addToSentences.push(results[1][e]);}

    }
    // for (var q in addToWords){bagOfWords.push(addToWords[q]);}
    for (var s in addToSentences){bagOfSentences.push(addToSentences[s]);}
    bagOfWords = makeArrayOfUniqueWords(addToWords); //gotta be unique
    bagOfSentences = makeArrayOfUniques(bagOfSentences); //gotta be unique
  }

  // console.log(bagOfWords);
  // console.log(bagOfSentences);
  clearSVG();
  for (var i in bagOfSentences){
      console.log("Inserting",bagOfSentences);
      senList = bagOfSentences[i].split(" ");
      for (var j in senList){
          insertSentence(senList[j]);
      }
  }
}

function showSentence(){
  var sNum = $("#w4").val().toLowerCase();
  clearSVG();
  insertSentence(sNum);
}
function makeArrayOfUniques(array){
  var uniqueArray = [];
  $.each(array, function(i, el){
    if($.inArray(el, uniqueArray) === -1) uniqueArray.push(el);
  });
  return uniqueArray;
}

function makeArrayOfUniqueWords(array){
  var uniqueArray = [];
  var size = array.length;
  for (var i = 0; i< size;i++){
    // console.log(array[i]);
    var sizeUni = uniqueArray.length;
    var flag = false;
    for(var j = 0;j<sizeUni;j++){
      if ((array[i][0].localeCompare(uniqueArray[j][0]) == 0) && (array[i][1].localeCompare(uniqueArray[j][1])) == 0){
        flag = true;
      }
    }
    if(flag == false){
      uniqueArray.push(array[i]);
    }
  }
  return uniqueArray;
}
