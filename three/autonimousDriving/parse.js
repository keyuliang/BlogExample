const BINARY_EXTENSION_HEADER_LENGTH = 12;
const BINARY_EXTENSION_CHUNK_TYPES = {
    JSON: 0,
    BIN: 1
};
const WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};

const WEBGL_COMPONENT_MULTIPLE = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4
}


function getMagicString(dataView) {
    var byteOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    return "".concat(String.fromCharCode(dataView.getUint8(byteOffset + 0))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 1))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 2))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 3)));
}

function decodeText( array ) {
    let s = '';
    for ( let i = 0, il = array.length; i < il; i ++ ) {

        // Implicitly assumes little-endian.
        s += String.fromCharCode( array[ i ] );

    }
    return s
}

function padTo4Bytes(byteLength) {
    let a = byteLength + 3 & ~3;
    return a
}


export default class ParseGlb {
    constructor(data){
        const headView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
        this.header = {
            magic: getMagicString(headView, 0),
            versoin: headView.getUint32(4, true),
            length: headView.getUint32(8, true)
        }
        this.content = null;
        this.body = null;

        const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
		const chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );

        let chunkoffset = 0;

        while( chunkoffset < chunkContentsLength ){
            let chunkLength = chunkView.getUint32(chunkoffset, true);
            chunkoffset += 4;
            let chunkType = chunkView.getUint32(chunkoffset, true);
            chunkoffset += 4;
            
            if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {
                const contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkoffset, chunkLength );
                this.content = JSON.parse(decodeText( contentArray )) 
            } else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {
                const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkoffset;
                this.body = data.slice( byteOffset, byteOffset + chunkLength );
            }
            chunkoffset += padTo4Bytes(chunkLength);
        }
        
        this._loadCloudPoint();
        this._loadVideoFrame();
    }
    parse(data, bufferOffset, bufferLength){
        
    }


    _loadAccessor(index){
        let accessors = this.content.accessors[index];
        if(!accessors) return;
        let { bufferView, componentType } = accessors;
        let option = this._loadBufferView(bufferView);
        let multiple = WEBGL_COMPONENT_MULTIPLE[componentType];
        let dataArray = new WEBGL_COMPONENT_TYPES[componentType](option.bufferView, 0, option.byteLength / multiple);
        return dataArray
    }

    _loadBufferView(index){
        let bufferViews = this.content.bufferViews[index];
        if(!bufferViews) return;
        let { byteLength, byteOffset } = bufferViews;
        return {
            bufferView: this.body.slice(byteOffset, byteOffset + byteLength),
            byteLength: bufferViews.byteLength,
        }
    }

    _loadCloudPoint(){
        let primitives = this.content.xviz.data.updates[0].primitives;
        let cloudPointOption = primitives["/lidar/points"];
        cloudPointOption.points.forEach(item =>{
            let colorI = item.colors.slice(12);
            let pointI = item.points.slice(12);
            item.colorsBuffer = this._loadAccessor(Number(colorI));
            item.pointsBuffer = this._loadAccessor(Number(pointI));
        })
    }

    _loadVideoFrame(){

        let primitives = this.content.xviz.data.updates[0].primitives;

        for(let key in primitives){
            if(key.search("camera") != -1){
                primitives[key].images.forEach(item =>{
                    let i = item.data.slice(9);
                    let url = this._loadImage(i);
                    item.url = url;
                })
            }
        }
    }

    _loadImage(imageIndex){
        let image = this.content.images[imageIndex];
        let option = this._loadBufferView(image.bufferView);
        const blob = new Blob( [ option.bufferView ], {
            type: image.mimeType
        } );
        let sourceURI = URL.createObjectURL( blob );
        return sourceURI;
    }

    _parseVideoFrame(arrayBuffer){
        // let view = new DataView(arrayBuffer);
        // let result = {}
        // var offset = 0;
       
        return result;
    }
}