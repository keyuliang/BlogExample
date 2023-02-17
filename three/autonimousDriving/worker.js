class streamWorker{
    constructor(workend){
        this.maxThread = 4;
        this.pendingData = [];
        this.workers = [];
        // this.workStatus = 'isClose';
        this.workend = workend;
    }

    work(data, index){
        if(this.workers.length < this.maxThread){
            let worker = new Worker('./worker.js')
            worker.onmessage = (event) =>{
                this.workend(event.data);
                if(this.pendingData != 0){
                    let data = this.pendingData.shift();
                    worker.postMessage(data);
                } else{
                    let index = this.workers.indexOf(worker);
                    this.workers.splice(index, i);
                    worker.terminate()
                }
            };

            this.workers.push(this.worker);

            worker.postMessage({
                data: data,
                index: index,
            })

        } else{
            this.pendingData.push({
                data: data,
                index: index,
            })
        }
    }

    

    workStart(){
        // if(this.pendingData.length == 0) return;
        // let len1 = this.pendingData.length,
        //     len2 = this.workers.length;
        // for(let i = 0; i < maxThread && i < len1; i++){
        //     let worker = new Worker('./worker.js');
        //     this.
        // }


        // let worker = this.workers.shift()

        // worker.postMessage({data: data, index: index});
    }

    workNext(){

    }
}