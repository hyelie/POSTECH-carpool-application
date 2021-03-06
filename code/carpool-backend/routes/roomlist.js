const express = require('express');
//const { connect } = require('./auth');
const { PayloadTooLarge } = require('http-errors');
const router = express.Router();
var pool = require('../db/initiate').pool;
var syncpool = require('../db/initiate').sync_pool;
// 미구현된 부분은 TODO : task의 형식으로 달았다.



// POST /roomlist
// (필수적으로) 입력 되는 값: car_type, depart_place, arrive_place, depart_time, arrive_time
router.post('/', async (req, res, next) => {
    console.log("post /roomlist in");
    // TODO : 로그인 에러
    if (req.session.user == undefined) {
        next(new Error('POST /roomlist error:0'));
    }
    else {
        console.log(req.body);
        car_type = req.body.car_type;
        depart_place = req.body.depart_place;
        arrive_place = req.body.arrive_place;
        depart_time = req.body.depart_time;
        arrive_time = req.body.arrive_time;
        current_headcount = req.body.current_headcount;
        total_headcount = req.body.total_headcount;
        current_carrier_num = req.body.current_carrier_num;
        total_carrier_num = req.body.total_carrier_num;

        // 시간 검사용 정규표현식
        var regExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

        // 오류처리
        if ((car_type != "자가용" && car_type != "택시") || depart_place == undefined || arrive_place == undefined || !regExp.test(depart_time) || !regExp.test(arrive_time)) {
            next(new Error('POST /roomlist error:1'));
        }
        else {
            // 1. MySql query문 만들기
            //`'${car_type}','${depart_place}','${arrive_place}','${depart_time}','${arrive_time}'` 와 같은 형태를 취한다
            //시간: 2020-07-29 14:10:23 형태를 한다
            var sql = `INSERT INTO pocarpool.roominfos (car_type, depart_place, arrive_place, depart_time, arrive_time,current_headcount, total_headcount, current_carrier_num, total_carrier_num, isConfirm, confirm_time) VALUES(?,?,?,?,?,?,?,?,?,0,NOW());
                        SELECT LAST_INSERT_ID();`;
            var maked_room_id;

            try{
                const connection = await syncpool.getConnection(async conn => conn);

                try{
                    var [rows] = await connection.query(sql, [car_type, depart_place, arrive_place, depart_time, arrive_time, current_headcount, total_headcount, current_carrier_num, total_carrier_num]);
                } catch(err2){
                    console.log("query err");
                }

                console.log("rosw info");
                console.log(rows[1][0]);
                maked_room_id = rows[1][0]['LAST_INSERT_ID()'];

                connection.release();

            } catch(err1){
                console.log("sync_pool err");
            } 

            res.json({
                "roomid" : maked_room_id
            });
            res.status(200).end();
        }
    }
});

// GET /roomlist
// GET /roomlist? 
// depart_place, arrive_place, depart_time, arrive_time 총 4개를 Query로 받을 수 있다. (출발장소, 도착장소, 출발시간, 도착시간)
router.get('/', function (req, res, next) {
    // TODO : 로그인 에러
    if (req.session.user == undefined) {
        console.log("login error");
        next(new Error('GET /roomlist error:0'));
    }
    else {
        /* query의 데이터들은 아래의 형식으로 들어오는 것을 확인할 수 있다.
        console.log(req.query.depart_place)
        console.log(req.query.arrive_place)
        console.log(req.query.depart_time)
        console.log(req.query.arrive_time)
        */

        // 1. MySql query문 만들기
        // 2. DB.query로 보내서 출력 가져오기
        // 3. 사용자에게 json 형식으로 출력하기

        // 1. MySql query문 만들기
        var element = {};
        var queryelement = [];
        var property = ``;
        if (req.query.depart_place != undefined) {
            element['depart_place'] = req.query.depart_place;
            queryelement.push(req.query.depart_place);
        }
        if (req.query.arrive_place != undefined) {
            element['arrive_place'] = req.query.arrive_place;
            queryelement.push(req.query.arrive_place);
        }
        if (req.query.depart_time != undefined) {
            element['depart_time'] = req.query.depart_time;
            queryelement.push(req.query.depart_time);
        }
        if (req.query.arrive_time != undefined) {
            element['arrive_time'] = req.query.arrive_time;
            queryelement.push(req.query.arrive_time);
        }

        for(let key in element){
            property += `${key}=? AND `
        }
        if(element != {}){
            property = property.slice(0, property.length-4);
        }

        console.log(`property : ${property}, queryelement : ${queryelement}\n`)
        


        // 쿼리 완성
        if (property == ``) {
            var sql = `SELECT * FROM pocarpool.roominfos`;
        }
        else {
            var sql = `SELECT * FROM pocarpool.roominfos WHERE ${property}`;
        }
        pool.getConnection(function (err, connection) {
            if (!err) {
                connection.query(sql, queryelement, (err, rows, fields) => {
                    console.log("here eerr");
                    console.log("error",err);
                    if (err) throw err;
                    console.log(rows);

                    res.json(rows); // 3. 사용자에게 json 형식으로 출력하기
                    res.status(200);
                });
            }
            console.log(pool._freeConnections.indexOf(connection));
            connection.release();
            console.log(pool._freeConnections.indexOf(connection));
        });
    }
});

// PUT /roomlist
router.put('/', (req, res, next) => {
    // TODO : 로그인 에러
    console.log("put in\n");
    if (req.session.user == undefined) {
        next(new Error('PUT /roomlist error:0'));
    } else {
        // UPDATE tablename SET column1 = value1, column2 = value2, ... WHERE condition
        var regExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        var updateData = [req.body.car_type, req.body.depart_place, req.body.arrive_place, req.body.depart_time, req.body.arrive_time, req.body.current_headcount, req.body.total_headcount, req.body.current_carrier_num, req.body.total_carrier_num, req.body.isConfirm, req.body.confirm_time];
        // PUT /roomlist 입력 값 에러 : 2
        // 모든 값이 undefined이거나
        // depart_time이 defined일 때 정규표현식에서 틀리거나
        // arrive_time이 defined일 때 정규표현식에서 틀리거나
        // isConfirmTime이 defined일 때 정규표현식에서 틀리거나.
        console.log(updateData);
        if (updateData.every((value) => { return value == undefined ? 1 : 0; }) || (updateData[3] != undefined && !regExp.test(updateData[3])) || (updateData[4] != undefined && !regExp.test(updateData[4])) || (updateData[10] != undefined && !regExp.test(updateData[10])) || req.body.roomID == undefined) {
            console.log("1 : %d\n, 2 : %d\n, 3 : %d\n, 4 : %d\n, 5 : %d\n", updateData.every((value) => { return value == undefined ? 1 : 0; }), (updateData[3] != undefined && !regExp.test(updateData[3])), (updateData[4] != undefined && !regExp.test(updateData[4])), (updateData[10] != undefined && !regExp.test(updateData[10])), req.body.roomID == undefined);
            next(new Error('PUT /roomlist error:1'));
        } else {
            // query 생성
            var updateQuery = "UPDATE pocarpool.roominfos SET";
            var roomCol = ["car_type", "depart_place", "arrive_place", "depart_time", "arrive_time", "current_headcount", "total_headcount", "current_carrier_num", "total_carrier_num", "isConfirm", "confirm_time"];
            console.log(roomCol, '\n', updateData);
            var notNULLcolumn = new Array();
            var j = 0;
            console.log("updatedata : ", updateData, updateData.length);
            for (var i = 0; i < updateData.length; i++) {
                if (updateData[i] != undefined) {
                    updateQuery = updateQuery + " " + roomCol[i] + "=?,";
                    notNULLcolumn[j] = updateData[i]; j++;
                }
            }
            console.log(`updateQuery : ${updateQuery}, notnulcollum : ${notNULLcolumn}\n`);
            updateQuery = updateQuery.slice(0, -1) + ` WHERE id=?`
            console.log(`updateQuery : ${updateQuery}, notnulcollum : ${notNULLcolumn}\n`);
            notNULLcolumn[j] = req.body.roomID;
            pool.getConnection(function (err, connection) {
                if (err) {
                    // TODO : DB에 접근 못 할때
                    console.log("PUT /roomlist error : 서버 이용자가 너무 많습니다.");
                    connection.release();
                    next(new Error('PUT /roomlist error:3'));
                } else {
                    connection.query(updateQuery, notNULLcolumn, (sqlErr) => {
                        if (sqlErr) {
                            // TODO : sql 내부 에러 처리
                            console.log("sql error\n");
                            connection.release();
                            console.log("PUT /roomlist error : SQL 내부 에러. query를 확인해 주세요.");
                            next(new Error('PUT /roomlist error:4'));
                        } else {
                            console.log("업데이트 완료");
                            res.status(200);
                        }
                    });
                }
                console.log("final\n");
                console.log(pool._freeConnections.indexOf(connection));
                connection.release();
                console.log(pool._freeConnections.indexOf(connection));
            });
            res.end();
        }   
    }
});

// DELETE /roomlist?roomID=
// -> POST /roomlist/delete
// pass
router.post('/delete', (req, res, next) => {
    // TODO : 로그인 에러
    if (req.session.user == undefined) {
        next(new Error('POST /roomlist/delete error:0'));
    } else {
        // DELETE FROM tablename WHERE condition;
        // 값 삭제
        var deleteQuery = `DELETE FROM pocarpool.roominfos WHERE id=?; DELETE FROM pocarpool.users_and_rooms_infos WHERE roomID = ?;
                            DELETE FROM pocarpool.messages WHERE roomID=?;`;
        pool.getConnection(function (err, connection) {
            if (err) {
                // TODO : DB에 접근 못 할때
                connection.release();
                console.log("POST /roomlist/delete error : 서버 이용자가 너무 많습니다.");
                next(new Error('POST /roomlist/delete error:3'));
            } else {
                connection.query(deleteQuery, [req.body.roomID, req.body.roomID, req.body.roomID], (sqlErr) => {
                    if (sqlErr) {
                        // TODO : sql 내부 에러 처리
                        console.log("POST /roomlist/delete error : SQL 내부 에러. query를 확인해 주세요. 해당하는 방이 없습니다.");
                        connection.release();
                        next(new Error('POST /roomlist/delete error:4'));
                    } else {
                        console.log("삭제 완료");
                        res.status(200);
                    }
                });
            }
            console.log(pool._freeConnections.indexOf(connection));
            connection.release();
            console.log(pool._freeConnections.indexOf(connection));
        });
        res.end();
    }
});


// GET /roomlist/userid?userID=
// -> POST /roomlist/getroom
// -> GET /roomlist/getroom
// pass
router.get('/getroom', function (req, res, next) {
    // TODO : 로그인 에러
    if (req.session.user == undefined) {
        next(new Error('POST /roomlist/getroom error:0'));
    } else {
       
            // userid가 속한 방에 대한 정보 출력, ./db/testquery 파일 참고.
            var belongQuery = `SELECT roominfos.id, car_type, depart_place, arrive_place, depart_time, arrive_time, current_headcount, total_headcount,
            current_carrier_num, total_carrier_num, isConfirm, confirm_time FROM pocarpool.roominfos INNER JOIN pocarpool.users_and_rooms_infos
            ON roominfos.id = users_and_rooms_infos.roomID WHERE users_and_rooms_infos.userid = ? ORDER BY depart_time ASC;`;

            pool.getConnection(function (err, connection) {
                if (err) {
                    // TODO : DB에 접근 못 할 때
                    console.log("GET /roomlist/getroom error : 서버 이용자가 너무 많습니다.");
                    connection.release();
                    next(new Error('GET /roomlist/getroom error:3'));
                } else {
                    connection.query(belongQuery, [req.session.user.id], (err, result) => {
                        console.log(belongQuery);
                        if (err) {
                            // TODO : sql 내부 에러 처리
                            console.log("GET /roomlist/getroom error : SQL 내부 에러. query를 확인해 주세요.");
                            connection.release();
                            next(new Error('GET /roomlist/getroom error:4'));
                        } else {
                            console.log("id에 해당하는 사람이 속해있는 방의 정보 출력", result, req.session.user.id);
                            res.json(result);
                            res.status(200);
                        }
                    });
                }
                console.log(pool._freeConnections.indexOf(connection));
                connection.release();
                console.log(pool._freeConnections.indexOf(connection));
            });
    }
});

// POST /roomlist/adduser
// pass
router.post('/adduser', function (req, res, next) {
    // TODO : 로그인 에러
    console.log("adduser - \n", req.session.user);
    if (req.session.user == undefined) {
        console.log("login err\n");
        next(new Error('POST /roomlist/userid error:0'));
    } else {
        if (req.session.user.id == undefined) {
            // TODO : 접근 권한 오류
            console.log("not master\n");
            next(new Error('POST /roomlist/adduser error:2'));
        } else {
            // query
            var addUsersRoomQuery = `INSERT INTO pocarpool.users_and_rooms_infos (userID, roomID) SELECT ?, ? FROM dual
                                        WHERE EXISTS (SELECT pocarpool.users.id FROM pocarpool.users WHERE pocarpool.users.id = ? LIMIT 1)
                                        AND EXISTS (SELECT roominfos.id FROM pocarpool.roominfos WHERE roominfos.id = ? LIMIT 1)
                                        AND NOT EXISTS (SELECT * FROM pocarpool.users_and_rooms_infos WHERE userid = ? AND roomid = ? LIMIT 1);`;
            var userID = req.session.user.id;
            var roomID = req.body.roomID;
            console.log("userid : %d, roomid : %d\n", userID, roomID);
            pool.getConnection(function (err, connection) {
                if (err) {
                    // TODO : DB에 접근 못 할 때
                    console.log("POST /roomlist/userid error : 서버 이용자가 너무 많습니다.");
                    console.log("many user\n");
                    connection.release();
                    next(new Error('POST /roomlist/userid error:3'));
                } else {
                    console.log("continue\n");
                    connection.query(addUsersRoomQuery, [userID, roomID, userID, roomID, userID, roomID], (err, result) => {
                        if (err) {
                            // TODO : sql 내부 에러 처리
                            console.log("POST /roomlist/userid error : SQL 내부 에러. query를 확인해 주세요.");
                            connection.release();
                            next(new Error('POST /roomlist/userid error:4'));
                        } else {
                            console.log("here\n");
                            res.status(200);
                        }
                    });
                }
                console.log(pool._freeConnections.indexOf(connection));
                connection.release();
                console.log(pool._freeConnections.indexOf(connection));
                res.end();
            });
        }
    }
});

// DELETE /roomlist/userid/:userID/:roomID
// -> POST /roomlist/deluser
// pass
router.post('/deluser', (req, res, next) => {
    // TODO : 로그인 에러
    if (req.session.user == undefined) {
        next(new Error('POST /roomlist/deluser error:0'));
    } else {
            var deleteQuery = `DELETE FROM pocarpool.users_and_rooms_infos WHERE userid = ? AND roomid = ?;`;
            pool.getConnection(function (err, connection) {
                if (err) {
                    // TODO : DB에 접근 못 할때
                    console.log("POST /roomlist/deluser error : 서버 이용자가 너무 많습니다.");
                    connection.release();
                    next(new Error('POST /roomlist/deluser error:3'));
                } else { 
                    connection.query(deleteQuery, [req.session.user.id, req.body.roomID], (sqlErr) => {
                        if (sqlErr) {
                            // TODO : sql 내부 에러 처리
                            connection.release();
                            console.log("POST /roomlist/deluser error : SQL 내부 에러. query를 확인해 주세요.");
                            next(new Error('POST /roomlist/deluser error:4'));
                        } else {
                            console.log("삭제 완료");
                            res.status(200).end();
                        }
                    });
                }
                console.log(pool._freeConnections.indexOf(connection));
                connection.release();
                console.log(pool._freeConnections.indexOf(connection));
            });
            res.end();
        
    }
});

// 오류 처리기
// 0 : TODO : 로그인 에러
// 1 : TODO : 입력값 에러
// 2 : TODO : 접근 에러
// 3 : TODO : 동시에 너무 많은 접속이 있을 때
// 4 : TODO : query 에러
router.use((err, req, res, next) => {
    console.log("something wrong!!!\n");
    res.json({ message: err.message });
    res.status(404);
})

module.exports = router;