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
                console.log(this.content)
            } else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {
                const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkoffset;
                this.body = data.slice( byteOffset, byteOffset + chunkLength );
                console.log(this.body)
            }
            chunkoffset += padTo4Bytes(chunkLength);
            console.log(chunkoffset)
        }
        

    }
    parse(data, bufferOffset, bufferLength){
        
    }


    _loadAccessor(index){
        let accessors = this.content.accessors[index];
        if(!accessors) return;
        let { bufferView, componentType } = accessors;
        let dataArray = this._loadBufferView(bufferView, componentType);
        console.log(dataArray)
    }

    _loadBufferView(index, componentType){
        let bufferViews = this.content.bufferViews[index];
        if(!bufferViews) return;

        let dataArray = new WEBGL_COMPONENT_TYPES[componentType](this.body, bufferViews.byteOffset, bufferViews.byteLength);
        return dataArray;
    }

    loadCloudPoint(){
        let primitives = this.content.xviz.data.update[0].primitives;

    }
}