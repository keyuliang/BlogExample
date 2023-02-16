onmessage = function(evt){
    var data = evt.data;
    data.id++;
    postMessage(data); //{message:'Hello world', id:2}
}