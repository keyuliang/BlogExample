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
        this.mateData = {}

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
        console.log(this.content)
        
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
            let result = {};
            let colorI = item.colors.slice(12);
            let pointI = item.points.slice(12);
            result.colorsBuffer = this._loadAccessor(Number(colorI));
            result.pointsBuffer = this._loadAccessor(Number(pointI));
            if(this.mateData['cloudPoint']){
                this.mateData['cloudPoint'].push(result);
            } else{
                this.mateData["cloudPoint"] = [result];
            }

        })
    }

    _loadVideoFrame(){

        let primitives = this.content.xviz.data.updates[0].primitives;

        for(let key in primitives){
            if(key.search("camera") != -1){
                primitives[key].images.forEach(item =>{
                    let i = item.data.slice(9);
                    let url = this._loadImage(i);
                    if(this.mateData[key]){
                        this.mateData[key].push(url);
                    } else {
                        this.mateData[key] = [url];
                    }
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

    _extractData(){
        let primitives = this.content.xviz.data.updates[0].primitives;
        this.mateData.label = primitives['/tracklets/label'].texts;

        let objects = primitives['/tracklets/objects'];
        objects.polygons.forEach(item =>{
            let height = item.base.style.height;
            let mesh = this._buildExtrudeMeshAndLine(item.vectices, height);
            mesh.classes = item.classes;
            mesh.objectId = item.object_id;
            if(this.mateData.mesh){
                this.mateData.mesh.push(mesh);
            }else{
                this.mateData.mesh = [mesh];
            }
        })

        let trackingPoint = primitives["/tracklets/tracking_point"];
        trackingPoint.circles.forEach(item =>{
            let circle = {
                objectId: item.base.object_id,
                center: item.center,
            }
            if(this.mateData.circles){
                this.mateData.circles.push(circle);
            }else{
                this.mateData.circles = [circle];
            }
        })

        let trajectory = primitives['/tracklets/trajectory'];
        trajectory.polylines.forEach
 


    }

    _buildExtrudeMeshAndLine(path, height){
        let topVectives = path.map(vectex => vectex.map(v => v + height))
        let vectices = path.concat(topVectives);
        let meshIndices = [], lineIndices = [];
        //bottom
        meshIndices = meshIndices.concat([0,2,1,0,3,2])
        //top
        meshIndices = meshIndices.concat([4,5,6,4,6,7])
        //front
        meshIndices = meshIndices.concat([0,1,5,0,5,4])
        //back
        meshIndices = meshIndices.concat([2,3,7,2,7,6])
        //left
        meshIndices = meshIndices.concat([3,0,4,3,4,7])
        //right
        meshIndices = meshIndices.concat([2,1,5,2,5,6])

        lineIndices = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
        return {
            vectices: vectices,
            meshIndices: meshIndices,
            lineIndices: lineIndices,
        }
    }

    _buildCircle(radius, segments){
		// let vertices = [ 0, 0, 0 ];
		// // let normals = [0, 0, 1 ];
        // let indices = [];
        // for ( let s = 0; s <= segments; s ++) {

		// 	const segment = s / segments *  Math.PI * 2;
		// 	vertex.x = radius * Math.cos( segment );
		// 	vertex.y = radius * Math.sin( segment );
		// 	vertices.push( vertex.x, vertex.y, vertex.z );

		// 	// normals.push( 0, 0, 1 );
		// }

        // for ( let i = 1; i <= segments; i ++ ) {

		// 	indices.push( 0, i, i + 1);

		// }
    }

    _buildLine(path, width){
        if(path.length < 2) return;
        let vectices = []
        for(let i = 0, len = path.length; i < len; i++){
            if(i === 0 || i === (len -1)){
                let x1 = path[i + 1][0] - path[i][0],
                    y1 = path[i + 1][1] - path[i][1];
                    x2 = -y1 +  path[i][0],
                    y2 = x1 +  path[i][1],
                    x3 = y1 +  path[i][0],
                    y3 = -x1 +  path[i][1];
                vectices.push([x2, y2, path[i][2]])
                vectices.push([x3, y3, path[i][2]])
            } else if( i === (len -1)){
                let x1 = path[i][0] - path[i - 1][0],
                    y1 = path[i][1] - path[i - 1][1];
                    x2 = -y1 +  path[i][0],
                    y2 = x1 +  path[i][1],
                    x3 = y1 +  path[i][0],
                    y3 = -x1 +  path[i][1];
                vectices.push([x2, y2, path[i][2]])
                vectices.push([x3, y3, path[i][2]])
            }
        }
    }

    
}