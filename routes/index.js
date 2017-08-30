var express = require('express');
var router = express.Router();
// AvILoS - 설치한 라이브러리 Import
var async = require('async');
var winston = require('winston');
require('winston-daily-rotate-file');
require('date-utils');

var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.Console)({level: 'info'}),
    new(winston.transports.DailyRotateFile)({
      name: 'dailyLog',
      level: 'info',
      filename: './log/daily-',
      timestamp: function(){return new Date().toFormat('YYYY-MM-DD HH24:MI:SS')},
      datePattern:'yyyyMMdd',
      json:false
    })
  ]
})
var fstools = require('fs-tools');
var file1 = require('file-system');
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
var baseImageDir = __dirname + '/../images/';
var fsex = require('fs-extra');
//var rmdir1 = require('rmdir');
var exec = require('child_process').exec;

//var iconv = require('iconv-lite');
//var requestOptions = { method: "POST", encoding: null};
var Iconv = require('iconv').Iconv;
var iconv = new Iconv('utf-8', 'utf-8//translit//ignore');

//var Promise = require('promise');
var Q = require('q');




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
                if(err){
                  console.log('it seems to be a err');
                  err.status(500); next(err); }
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


function setInfos(infos, key, value){
    infos[key] = String(value);
};


function deleteTmpFile(res, action, isFile, tmpFile) {
  var strTmpFile = tring(tmpFile);
  fs.stat(strTmpFile, function(err1, stat){ ///< for delete tmp file.
    if( err1 ) { //  파일이 없다면 upload된 파일을 쓴다.
      console.log('console, No Tmp File');
      logger.info('No tmp file');
    } else {
      console.log('console, theres Tmp File');
      if( isFile == 'N' ){ // if it's directory then..
        try { // using another.
          exec('rm -rf ' + strTmpFile, handleErr(err, res, action, tmpFile));
        } catch(err1) {
          logger.error(err1);
        }
      } else { // if it's file then..
        fs.unlink(strTmpFile, handleErr(err, res, action, tmpFile));
      }
      logger.info('deleting Downloaded tmp file');
    }
  })
}

function handleErr(err, res, action, isFile, tmpFile){
  logger.info('------HANDLE ERR------');

    if(err){
        //deleteTmpFile(res, action, isFile, tmpFile);
        //console.log(action + " : Failure file.");
        logger.info(action + ' : Failure file.');
        logger.error(err);
        err.status(500);
        //console.log(err);
    } else {
        //console.log(action + " : Success file.");
        //deleteTmpFile(res, action, isFile, tmpFile);
        logger.info(action + " : Success file.");
        res.status(200);
        res.json({error:null,data:'Upload successful'});
    }
}

function handleErr2(err, action){
    if(err){
      logger.info(action + ' : Failure file.');
      logger.error(err);
    } else {
      logger.info(action + " : Success file.");
    }
}

function changePath(infos, key, value){
    if(key == 'fullpath' || key == 'oldFullpath') {
        var fullpath = String(value);
        fullpath = fullpath.replace(':', '#');
        fullpath = fullpath.replace(/\\/gi, '/');
        infos[key] = path.normalize(baseImageDir + fullpath);
    }
    if(key == 'fullpath'){
      var extension = path.extname(fullpath);
      if (extension === '') {  // 폴더만이면,
          infos['isFile'] = 'N';
      } else {    // 파일이면,
          infos['isFile'] = 'Y';
      }
    }
}

var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};



function deleteTmpFile(tmpFile){
    fs.stat(tmpFile, function(err,stat){
      if( err ){  // no file.
        logger.info('Theres no tmp file');
      }  else {
        logger.info('theres tmp file.');
        fs.unlink(tmpFile, function(err){
          if( err ){
            logger.info('cant delete tmp file');
            logger.error(err);
          }
        });
      }
    });
}
var fRename = Q.denodeify(fs.rename);
var fstat = Q.denodeify(fs.lstat);
var fExec = Q.denodeify(exec);

var promExistFile = function(infos){
  var deferred = Q.defer();

  if( infos['isFile'] == 'Y') {
      infos['oldPath'] = path.dirname(infos['oldFullpath'])
  } else {
      infos['oldPath'] = infos['oldFullpath'];
  }
  if( !fs.existsSync(infos['oldFullpath'] )) {
    console.log('No file1');
    infos['delFullpath'] = infos['oldFullpath'];
    infos['oldFullpath'] = String(infos['tmpFullpath']);
    console.log('No file2');
  }
  console.log('No file3');
  deferred.resolve(infos);
  return deferred.promise;
}

var promExistDelFile = function(infos){
  var deferred = Q.defer();
  if( infos['isFile'] == 'Y') {
      infos['oldPath'] = path.dirname(infos['fullpath'])
  } else {
      infos['oldPath'] = infos['fullpath'];
  }
  if( !fs.existsSync(infos['delFullpath'])){
    logger.log('info', 'theres no file : ' + infos['delFullpath']);
    //deferred.reject(new Error());
    //return deferred.promise;
  }
  logger.log('info', 'theres file');
  deferred.resolve(infos);
  return deferred.promise;
}

var promRename = function(p){
  return new Promise(function( resolved, rejected){
    console.log("Rename File : " + p['oldFullpath'] + ' to ' + p['fullpath']);
    fRename(p['oldFullpath'], p['fullpath']);
    resolved('Rename Success');
    return p;
  })
};

var promRemoveOldFile = function(p){
  return new Promise(function( resolved,rejected){
    console.log("Del Tmp : " + p['delFullpath']);
    fExec("rm -rf '" + p['delFullpath'] + "'");
    resolved('Deleteed File');
    return p;
  });
};


var promRemoveEmptyFolder = function(p){
  return new Promise(function( resolved, rejected){
    logger.log('info', "Del Empty Folder : " + p['oldPath']);
    fExec("rm -d '" + p['oldPath'] + "'"); // Direcotry내에 파일이 있다면, 아무것도 하지 않는다.
  })
}

var promReturnCode = function(p){
  return new Promise(function( resolved, rejected){
    //console.log(p);
    console.log("Prom ret");
    p['res'].status(200);
    p['res'].json({error:null,data:'Upload successful'});
    resolved('return code Success');
  })
}

var promCatchErr = function(err){
  return new Promise(function( resolved, rejected ){
    logger.log('info','found err');
    console.log(err);
    //rejected('ddd');
    //throw err;
  })
}

//var option = { url: url, encoding: 'binary'};
router.post('/upload4', function(req, res) {
    //var strContents = new Buffer(body);
    //console.log(iconv.decode(strContents, 'EUC-KR').toString());

    var infos = {"action":''
    , "hashValue": ''
    , "fileSize": ''
    , "isFile": ''
    , "path": ''
    , "oldPath": ''
    , "fullpath": ''
    , "oldFullpath": ''
    , "tmpFullpath": ''
    , "delFullpath": ''
    , "res": ''};

    var form = new multiparty.Form({
      autoFiles: true,
      uploadDir: '/app/tmp'});
      //uploadDir: '/home/dave/dev/js/DEMORTB/tmp'});

    form.on('field',function(name,value){
        //console.log('normal field / name = '+name+' , value = '+value);
        //var buf = new Buffer(value, 'binary');
        //var val = iconv.convert(buf).toString('utf-8');
        logger.log('info', 'normal field / name = '+name+' , value = '+value);
        setInfos(infos, name, value);
        changePath(infos, name, value);    // fullpath/oldFullpath에만 동작한다.
    });

    form.on('files', function( name, value ){
      logger.log('info', 'normal files / name = '+name+' , value = '+value);
    });


    form.on('error', (err) => {
      console.log('deal with err');
      res.status(500);
      res.json({error:null,data:'Upload fail'});

    })
    logger.log('info', '## Set Source Path ##');
    form.on('progress', function(receivedBytes, expectedBytes){
        console.log(((receivedBytes/expectedBytes)*100).toFixed(1)+'% received');
    });

    logger.log('info', '########## START PARSE ##########');
    form.parse(req, function(err, fields, files) {
      if( err ) console.log(err);
        // Object.keys(fields).forEach(function (name) {
        //     console.log(fields[name]);
        // });

        // 실제 파일이 받아지는 tmp의 위치를 확보한다.
        //console.log(infos);
        console.log('1');

        var oriName;
        if( infos['action'] != 'REMOVED')
        {
          Object.keys(files).forEach(function (name) {
              logger.log('info', '1-1');
              oriName = files[name];
              logger.log('info', 'and got field Value! ' + oriName[0].path);
              logger.log('info', '1-2');
              var onlyPath;   //  실제 파일이 받아지는 위치
              if( infos['isFile'] == 'Y') {
                  onlyPath = path.dirname(infos['fullpath']);
              } else {
                  onlyPath = infos['fullpath'];
              }
              infos['path'] = String(onlyPath);


              //mkdirp.sync(onlyPath);
              mkdirp.sync(onlyPath, function (err) {
                  if (err) {
                      console.log("Failure make new folder.");
                      res.status(500);
                  } else {
                      console.log("Success make new folder.");
                  }
                })
              })
        }


            console.log('2');
            // initialization source path using Action.
            var srcFullpath;
            if( infos['action'] == 'ADDED' || infos['action'] == 'MODIFIED' ) {
              srcFullpath = oriName[0].path;
              console.log(oriName[0].path);
            } else {
              srcFullpath = infos['oldFullpath'];
            }


             try {
                switch(infos['action']) {
                    case 'ADDED'    :
                        if( infos['isFile'] == 'Y')
                          fs.rename(srcFullpath, infos['fullpath'], handleErr(err, res, infos['action'], infos['isFile'], oriName[0].path));
                        else {
                          deleteTmpFile(oriName[0].path);
                          res.status(200);
                          res.json({error:null,data:'Upload successful'});
                        } // don't worry about directory.
                        break;
                    case 'MODIFIED' :
                        // 중복파일이 존재하면 그냥 넘긴다.
                        if( infos['isFile'] == 'Y'){
                            fs.rename(srcFullpath, infos['fullpath'], handleErr(err, res, infos, oriName[0].path));
                        } else {
                            deleteTmpFile(oriName[0].path);
                        }
                        break;
                    case 'REMOVED' :
                        //fs.stat(srcFullpath, function(err,stat){
                          // if( err ) { //  파일이 없다면 upload된 파일을 쓴다.
                          //   logger.info(infos['action']+' No old file : ' + srcFullpath);
                          //   res.status(500);
                          //   res.render('error', { error: err });
                          // } else {
                          //   if( infos['isFile'] == 'N' ){ // if it's directory then..
                          //
                          //     //fs.rmdir(infos['fullpath'], handleErr(res, infos['action'], err));
                          //     // rmdir1(infos['fullpath'], function(err, dirs, files){
                          //     //     file1.rmdirSync(infos['fullpath']);
                          //     //rimraf(infos['fullpath'], handleErr(res, infos['action'], err));
                          //     //fs.removeSync(infos['fullpath']);
                          //
                          //     try { // using another.
                          //       exec('rm -rf ' + infos['fullpath'], handleErr(err, res, infos['action'], oriName[0].path));
                          //     } catch(err) {
                          //       logger.error(err);
                          //     }
                          //     //deleteFolderRecursive(infos['fullpath']);
                          //   } else { // if it's file then..
                          //     fs.unlink(infos['fullpath'], handleErr(err, res, infos['action'], oriName[0].path));
                          //   }
                          // }
                          logger.log('info', 'target : ' + infos['fullpath']);
                          infos['delFullpath'] = infos['fullpath'];
                          infos['res'] = res;
                          return promExistDelFile(infos)
                          .then(promRemoveOldFile(infos))
                          .then(promRemoveEmptyFolder(infos))
                          .then(promReturnCode(infos))
                          .catch(promCatchErr)

                        //})
                        break;
                    case 'RENAME' :
                        // 확인 목록
                        // 1. 파일 및 폴더 이름 바뀌기, 이전 이름 파일 삭제
                        //// 아래 경우는 Client에서 어떻게 처리하는지 확인 후 작업
                        // 2. 파일 이동, 동일 파일명 덮어쓰기기
                        // 3. 내용 물이 다른 폴더 덮어쓰기
                        // 4. 빈 폴더가 내용 있는 폴더 덮어쓰기
                        //
                        // 파일이 없다면 Src는 tmp쪽이 된다.
                        console.log('##RENAME##');
            // if( fs.existsSync(srcFullpath) == false ) {
                        //   srcFullpath = oriName[0].path;
                        //   logger.info('Changed old file is : ' + srcFullpath);
                        // }
                        infos['tmpFullpath'] = oriName[0].path;
                        infos['delFullpath'] = oriName[0].path;
                        infos['res'] = res;
                        return promExistFile(infos)
                        .then(promRename(infos))
                        .then(promRemoveOldFile(infos))
                        .then(promRemoveEmptyFolder(infos)) //  plz use timer..
                        .then(promReturnCode(infos))
                        .catch(promCatchErr)



                        // fs.rename(srcFullpath, infos['fullpath'], handleErr(err, res, infos['action'], oriName[0].path));
                        // var onlySrcPath;
                        // if( infos['isFile'] == 'Y') {
                        //     onlySrcPath = path.dirname(infos['oldFullpath']);
                        // } else {
                        //     onlySrcPath = infos['oldFullpath'];
                        // }

                        //fs.rmdir(onlySrcPath, handleErr(res, infos['action'], err));
                        break;
                    case 'CUT' :
                        console.log('##CUT##');
                        infos['tmpFullpath'] = oriName[0].path;
                        infos['delFullpath'] = oriName[0].path;
                        infos['res'] = res;
                        return promExistFile(infos)
                        .then(promRename(infos))
                        .then(promRemoveOldFile(infos))
                        .then(promRemoveEmptyFolder(infos)) //  plz use timer..
                        .then(promReturnCode(infos))
                        .catch(promCatchErr)
                        break;
                    case 'OVERWRITE' :
                        //fstools.move(srcFullpath, infos['fullpath'], handleErr(res, infos['action'], err));
                        logger.info('##OVERWRITE##');
                        // fs.stat(srcFullpath, function(err, stat){
                        //   if( err ) { //  파일이 없다면 upload된 파일을 쓴다.
                        //     console.log('No old file : ' + srcFullpath);
                        //     srcFullpath = oriName[0].path;
                        //   }
                        // })
                        infos['tmpFullpath'] = oriName[0].path;
                        infos['delFullpath'] = oriName[0].path;
                        infos['res'] = res;
                        return promExistFile(infos)
                        .then(promRename(infos))
                        .then(promRemoveOldFile(infos))
                        .then(promRemoveEmptyFolder(infos)) //  plz use timer..
                        .then(promReturnCode(infos))
                        .catch(promCatchErr)

                        // var thatRes = this;
                        // if( srcFullpath != infos['fullpath'] ) {
                        //   fsex.copy(srcFullpath, infos['fullpath'])
                        //   .then( () => { console.log('success!'); res.status(200); res.json({error:null,data:'Upload successful'}); })
                        //   .catch( err => { console.error(err); });
                        // } else {
                        //   res.status(203);
                        //   res.json({error:null,data:'Upload successful'});
                        // }

                        // Type to copy the all of directory.

                        break;
                }
            } catch(err) {
                console.log("###finally exception Err###");
                console.log(err);
                err.status(500);
            }
        //});
    });
})


module.exports = router;
