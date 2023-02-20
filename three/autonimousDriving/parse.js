// import * as THREE from "../build/three.module.js";
class Vector2 {

	constructor( x = 0, y = 0 ) {

		this.x = x;
		this.y = y;

	}

	get width() {

		return this.x;

	}

	set width( value ) {

		this.x = value;

	}

	get height() {

		return this.y;

	}

	set height( value ) {

		this.y = value;

	}

	set( x, y ) {

		this.x = x;
		this.y = y;

		return this;

	}

	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;

		return this;

	}

	clone() {

		return new this.constructor( this.x, this.y );

	}

	copy( v ) {

		this.x = v.x;
		this.y = v.y;

		return this;

	}

	add( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead.' );
			return this.addVectors( v, w );

		}

		this.x += v.x;
		this.y += v.y;

		return this;

	}

	addScalar( s ) {

		this.x += s;
		this.y += s;

		return this;

	}

	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;

		return this;

	}

	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;

		return this;

	}

	sub( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.' );
			return this.subVectors( v, w );

		}

		this.x -= v.x;
		this.y -= v.y;

		return this;

	}

	subScalar( s ) {

		this.x -= s;
		this.y -= s;

		return this;

	}

	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;

		return this;

	}

	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;

		return this;

	}

	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;

		return this;

	}

	dot( v ) {

		return this.x * v.x + this.y * v.y;

	}

	cross( v ) {

		return this.x * v.y - this.y * v.x;

	}

    
	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y );

	}

    divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}


	normalize() {

		return this.divideScalar( this.length() || 1 );

	}






	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;

	}

}


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


class ParseGlb {
    constructor(){
        this.content = null;
        this.body = null;
        this.mateData = {}
    }

    parse(data){
        const headView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
       let header = {
            magic: getMagicString(headView, 0),
            versoin: headView.getUint32(4, true),
            length: headView.getUint32(8, true)
        }

        const chunkContentsLength = header.length - BINARY_EXTENSION_HEADER_LENGTH;
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
        this._extractData();

        return this.mateData;
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
            let mesh = this._buildExtrudeMeshAndLine(item.vertices, height);
            mesh.classes = item.base.classes;
            mesh.objectId = item.base.object_id;
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

        let trackletsTrajectory = primitives['/tracklets/trajectory'];
        trackletsTrajectory.polylines.forEach((item,index) =>{
            let line = this._buildLine(item.vertices, 0.1, index);
            if(this.mateData.trackletsLine){
                this.mateData.trackletsLine.push(line);
            }else{
                this.mateData.trackletsLine = [line];
            }
        })
 
        let vehicleTrajectory = primitives['/vehicle/trajectory'];
        vehicleTrajectory.polylines.forEach(item =>{
            let line = this._buildLine(item.vertices, 0.3);
            if(this.mateData.vehicleLine){
                this.mateData.vehicleLine.push(line);
            }else{
                this.mateData.vehicleLine = [line];
            }
        })

    }

    _buildExtrudeMeshAndLine(path, height){
        path.pop()
        let topVectives = path.map(vectex => vectex.map((v, index) => index === 2? v + height : v))
        let vertices = path.concat(topVectives);
        let meshIndices = [], lineIndices = [];
        //bottom
        meshIndices = meshIndices.concat([0,1,2,0,2,3])
        //top
        meshIndices = meshIndices.concat([4,6,5,4,7,6])
        //front
        meshIndices = meshIndices.concat([0,5,1,0,4,5])
        //back
        meshIndices = meshIndices.concat([2,7,3,2,6,7])
        //left
        meshIndices = meshIndices.concat([3,4,0,3,7,4])
        //right
        meshIndices = meshIndices.concat([2,1,5,2,5,6])

        lineIndices = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
        return {
            vertices: [].concat.apply([], vertices),
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

    _buildLine(path, width, index){
        if(path.length < 2) return {};
        let vertices = [],
            indices = []
        for(let i = 0, len = path.length; i < len; i++){
            let point1, point2, dir, d = width, 
                temp1 = new Vector2(),
                temp2 = new Vector2();
            let prev = path[i - 1]? new Vector2(path[i - 1][0],path[i - 1][1]) : null,
                cur = new Vector2(path[i][0],path[i][1]),
                next = path[i + 1]? new Vector2(path[i + 1][0],path[i + 1][1]) : null;

            if(!prev && next){
                temp1.subVectors(next, cur).normalize();
                dir = new Vector2(-temp1.y, temp1.x).multiplyScalar(width)
            } else if(!next && prev){
                temp1.subVectors(cur, prev).normalize();
                dir = new Vector2(-temp1.y, temp1.x).multiplyScalar(width)
            } else{
                let v1 = temp1.subVectors(cur, prev).normalize(),
                    v2 = temp2.subVectors(cur, next).normalize(),
                    cosA = v1.dot(v2),
                    sinA = v1.cross(v2);
               
                // sinA = Math.abs(sinA) < 0.08? 0.08 * a : sinA 
            
                d = width / sinA;
     
                d = cosA > 0.5? 0.1*d : d 
                console.log(cosA, index)
                dir  = new Vector2().addVectors(v1.multiplyScalar(d) ,v2.multiplyScalar(d));
            }
            point1 = new Vector2().copy(dir).add(cur);
            point2 = new Vector2().copy(dir).multiplyScalar(-1).add(cur);

            vertices.push([point1.x, point1.y, path[i][2]]);
            vertices.push([point2.x, point2.y, path[i][2]]);
        } 
        for(let i = 0, len = path.length; i <= len - 2; i+=2){
            indices.push(i, i + 3, i + 2);
            indices.push(i, i + 1, i + 3);
        }

        return {
            vertices:  [].concat.apply([], vertices),
            indices: indices
        }
    }
}


self.onmessage = function(event){
    let parser = new ParseGlb();
    let mateData = parser.parse(event.data.data)
    postMessage({
        data: mateData,
        index: event.data.index,
    }); //{message:'Hello world', id:2}
}