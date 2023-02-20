export default class StreamWorker{
    constructor(workend){
        this.maxThread = 4;
        this.pendingData = [];
        this.workers = [];
        // this.workStatus = 'isClose';
        this.workend = workend;
    }

    work(data, index){
        if(this.workers.length < this.maxThread){
            let worker = new Worker('./parse.js')
            worker.onmessage = (event) =>{
                this.workend(event.data);
                if(this.pendingData.length != 0){
                    let temp = this.pendingData.shift();
                    worker.postMessage({
                        data: temp.data,
                        index: temp.index
                    });
                } else{
                    let i = this.workers.indexOf(worker);
                    this.workers.splice(i, 1);
                    worker.terminate()
                }
            };

            this.workers.push(worker);

            worker.postMessage({
                data: data,
                index: index
            })

        } else{
            this.pendingData.push({
                data: data,
                index: index,
            })
        }
    }
}