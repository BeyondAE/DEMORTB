var express = require('express');
var router = express.Router();
// AvILoS - 설치한 라이브러리 Import
var async = require('async');
var fstools = require('fs-tools');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var util = require('util');
var multer = require('multer');
var storage = multer.diskStorage({
    destination: function(req,file,cb){
        var paths = path.parse(req.body.fullpath);
        var savePath = 'uploads/'+'C/A/';
        cb(null, savePath);
    },
    filename: function(req,file,cb){
      cb(null,file.originalname);
    }
})
var upload = multer({storage: storage});
var multiparty = require('multiparty');
var  mkdirp = require('mkdirp');
var shell = require('shelljs');
var baseImageDir = __dirname + '\\..\\images\\';



function getUploadForm(req,res,next){
    res.render('index',{title:'File Upload'});
}


// 파일 업로드 함수
function uploadFile(req,res,next){

    // 안드로이드앱과 같은 모바일 애플리케이션에서의 요청의 인코딩 방식을 확인하기 위해 아래와 같이 검사구문 추가
    if(req.headers['content-type'] === 'application/x-www-form-urlencoded'){
        // 모바일 업로드 요청

    }else{//multipart/form-data
        // 일반 웹페이지 업로드 요청

    }

    var form = new formidable.IncomingForm();
    form.uploadDir = path.normalize(__dirname+"/../uploads");   // 업로드 디렉토리
 //   form.uploadDir = path.resolve("./images/")
    form.keepExtensions = true;                                 // 파일 확장자 유지
    form.multiples = true;                                      // multiple upload
    form.parse(req,function(err,fields,files){
        // 이 미들웨어는 멀티파트 요청을 파싱하기 위해 form.parse를 사용하는데
        // form.parse의 콜백함수의 매개변수(fields, files)로 폼의 필드 정보들과 파일 정보들이 전달된다.

        // 여러개의 파일을 업로드하는 경우
        if(files.pict instanceof Array){
            // async.each를 사용해 files.pict배열 객체의 각각의 파일을 /images 디렉토리로 옮긴다.
            async.each(files.pict, function(file,cb){
                // 파일명만 추출후 업로드되는 파일명으로 선택하여 이미지가 저장될 경로를 더해준다.
                var destPath = path.normalize(baseImageDir+path.basename(file.path));
                // 해당 파일명을 서버로 전송처
                fs.rename(file.path, destPath, function(err){
                    if(err) cb(err);
                    else cb();
                })
            }, function(err){
                // 최종 처리 콜백 함
                if(err){ err.status(500); next(err); }   // 에러가 아니면 성공여부 전달
                else{
                    res.status(200);
                    res.json({error:null,data:'Upload successful'});
                }
            });
        }
        // 파일을 선택하지 않았을때
        else if(!files.pict.name){
            // 파일 선택하지 않았을 경우 업로드 과정에서 생긴 크기가 0인 파일을 삭제한다.
            fstools.remove(files.pict.path, function(err){
                if(err){ err.status(500); next(err); }
                else{
                    res.status(200);
                    res.json({error:null,data:'Upload successful'});
                }
            })
        }
        // 파일을 하나만 선택했을때
        else{
            // 업로드된 파일을(files.pict) /images디렉토리로 옮긴다.
            // 업로드 되는 파일명을 추출해서 이미지가 저장될 경로를 더해준다.
            var destPath = path.normalize(baseImageDir+path.basename(files.pict.path));
            // 임시 폴더에 저장된 이미지 파일을 이미지 경로로 이동시킨다.
            fstools.move(files.pict.path, destPath, function(err){
                if(err){ err.status(500); next(err); }
                else{
                    res.status(200);
                    res.json({error:null,data:'Upload successful'});
                }
            })
        }
    });
    form.on('progress', function(receivedBytes, expectedBytes){
        console.log(((receivedBytes/expectedBytes)*100).toFixed(1)+'% received');
    });
}

// 이미지 조회 함수
function getImage(req,res,next){
    // Get방식으로 이미지의 파일명을 조회하면 이 함수로 들어와 imagepath값을 얻어온후
    // 해당 파일이 존재하면 스트림을 통해 읽어 요청한 클라이언트로 전송한다.
    // 요청한 파일이 없으면 next 미들웨어를 실행한다.
    var imagepath = req.params.imagepath;
    var filepath = path.normalize(baseImageDir+imagepath);
    fs.exists(filepath, function(exists){
        if(exists){
            res.statusCode = 200;
            res.set('Content-Type', mime.lookup(imagepath));
            var rs = fs.createReadStream(filepath);
            rs.pipe(res);
        }else{
            next();
        }
    })
}

function uploadFile2(req,res,next){
    var form = new formidable.IncomingForm();
    //form.uploadDir = baseImageDir;
    form.encoding = 'utf-8';
    form.keepExtensions = false;
    form.parse(req, function(err, fields, files) {
        var oldpath = files.file.path;
        var newpath = baseImageDir+path.basename(files.file.path);
        //var newpath = files.file.path;
        fs.rename(oldpath, newpath, function(err){
            if(err) console.log(err);
            else{
                console.log('File Uploaded!');
                res.write('File Uploaded!');
                res.end();
            }
        })
    });
    form.on('progress', function(receivedBytes, expectedBytes){
        console.log(((receivedBytes/expectedBytes)*100).toFixed(1)+'% received');
    });
}

// function uploadFile2(req,res,next){
//     var form = new formidable.IncomingForm();
//     form.onPart = function(part) {
//         if (!part.filename) {
//             // let formidable handle all non-file parts
//             console.log('2111');
//             form.handlePart(part);
//         }
//     }
//     console.log('21');
// }


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});
// 라우터에 router.VERB()를 이용해 마운트 경로'/'에 마운트 될 하위 경로를 설정하고 미들웨어 등록
router.post('/upload',uploadFile);
router.post('/upload2', uploadFile2);
router.get('/images/:imagepath', getImage);




router.post('/upload3', upload.single('upfile'), function(req,res) {
//    res.send('upload!' + req.file);

    console.log(req.file);
    console.log(req.body);
 //   var win32basename = path.win32.basename(req.body.transferSize);
  //  var basicbasename = path.basename(req.body.transferSize);
  //  console.log(fullpath);
})


function setInfos(infos, fields, info){
    infos[info] = String(fields[info]);
};


function handleErr(err){
    if(err){
        console.log("Failure rename file.");
        throw err;
    } else {
        console.log("Success rename file.");
        res.status(200);
        res.json({error:null,data:'Upload successful'});
    }
}

function changePath(fields, name, infos){
    if(name == 'fullpath' || name == 'oldFullpath') {
        var fullpath = String(fields[name]);
        fullpath = fullpath.replace(':', '#');
        var extension = path.extname(fullpath);
        if (extension == '') {  // 폴더만이면,
            infos[name] = path.normalize(baseImageDir + fullpath);
            infos['isFile'] = 'N';
        } else {    // 파일이면,
            infos[name] = path.normalize(baseImageDir + fullpath);
            infos['isFile'] = 'Y';
        }
    }
}


function doAdd(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.rename(downTmpPath, infos['fullpath'], handleErr(err));
    }
    //  Folder면 앞서, 생성했기에 Pass
}

function doModify(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.rename(downTmpPath, infos['fullpath'], handleErr(err));
    }
    //  Folder면 앞서, 생성했기에 Pass
}

function doRemove(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.unlink(infos['fullpath'],handleErr(err));
    } else {
        fs.rmdir(infos['fullpath'],handleErr(err));
    }
    //  Folder면 앞서, 생성했기에 Pass
}

function doRename(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.rename(infos['oldFullpath'], infos['fullpath'], function(err){
            if(err) {
                console.log("err rename");
                err.status(500);
            }
        });

    } else {    // Foler면 Rename을 할까, 삭제하고 생성할까.. 테스트 필요.
        fs.rename(infos['oldFullpath'], infos['fullpath'],function(err){
            if(err) {
                console.log("err rename");
                console.log(err);
            }
        });

        //fs.rmdir(infos['oldFullpath'], handleErr(err));
        //mkdirp(path.dirname['infos'], handleErr(err));
    }
}

function doCut(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.rename(infos['oldFullpath'], infos['fullpath'], function(err){
            if(err) {
                console.log("err cut");

            }
        });

        fs.unlink(infos['oldFullpath'],handleErr(err));
    } else {    // Foler면 Rename을 할까, 삭제하고 생성할까.. 테스트 필요.
        fs.rename(infos['oldFullpath'], infos['fullpath'], function(err){
            if(err) {
                console.log("err cut");

            }
        });

        fs.rmdir(infos['oldFullpath'], function(err){
            if(err) {
                console.log("err cut");
            }
        });

    }
}

function doOverwrite(infos, downTmpPath){
    if( infos['isFile'] == 'Y') {
        fs.rename(infos['oldFullpath'], infos['fullpath'], function(err){
            if(err) {
                console.log("err ow");
            }
        });

        fs.unlink(infos['oldFullpath'],handleErr(err));
    } else {    // Foler면 Rename을 할까, 삭제하고 생성할까.. 테스트 필요.
        fs.rename(infos['oldFullpath'], infos['fullpath'], function(err){
            if(err) {
                console.log("err ow");
            }
        });

        fs.rmdir(infos['oldFullpath'], handleErr(err));
    }
}



router.post('/upload4', function(req, res) {
    var form = new multiparty.Form();
    var infos = {"action":'', "hashValue": '',"isFile": '',"fullpath": '', "oldFullpath": ''};
    form.on('field',function(name,value){
        console.log('normal field / name = '+name+' , value = '+value);
    });

    form.parse(req, function(err, fields, files) {
        Object.keys(fields).forEach(function (name) {
            setInfos(infos, fields, name);
            changePath(fields, name, infos);    // fullpath/oldFullpath에만 동작한다.
        });

        // 실제 파일이 받아지는 tmp의 위치를 확보한다.
        console.log(infos);
        Object.keys(files).forEach(function (name) {
            var oriName = files[name];
            console.log('and got field Value! ' + oriName[0].path);

            var onlyPath;   //  실제 파일이 받아지는 위치
            if( infos['isFile'] == 'Y') {
                onlyPath = path.dirname(infos['fullpath']);
            } else {
                onlyPath = infos['fullpath'];
            }

            //mkdirp.sync(onlyPath);

            mkdirp.sync(onlyPath, function (err) {
                if (err) {
                    console.log("Failure make new folder.");
                    res.status(500);
                } else {
                    console.log("Success make new folder.");
                }
            })

            try {
                switch(infos['action']) {
                    case 'ADDED'    :
                        doAdd(infos, onlyPath);
                        break;
                    case 'MODIFIED' :
                        doModify(infos, onlyPath);
                        break;
                    case 'REMOVED' :
                        doRemove(infos, onlyPath);
                        break;
                    case 'RENAME' :
                        doRename(infos, onlyPath);
                        break;
                    case 'CUT' :
                        doCut(infos, onlyPath);
                        break;
                    case 'OVERWRITE' :
                        doOverwrite(infos, onlyPath);
                        break;
                }
            } catch(err) {
                console.log("###finally exception Err###");
            }



        });
    });

})





module.exports = router;