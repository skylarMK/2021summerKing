(function () { })();
var vm = new Vue({
    el: "#app",
    data() {
        return {
            name: '2021summerking',
            apiBaseUrl: "https://event.setn.com/ci",
            user: {
                id: "",
                name: "",
                email: "",
                token: "",
                hasAgreed: null,
                reward: "",
            },
            coffee: {
                show: 0,
                start_time: "12:00:00",
                end_time: "16:00:00",
                inputshow: 0
            },
            game: {
                eventMember: 0,
                correct: 0,
                round: 0,
                score: 0,
                /* 0: 未開始, 1: 預備中, 2: 進行中, 3: 認證中, 4: 結束 */
                playState: 0,
                /* 0: 隱藏, 1: preload, 2: share, 3: video, 4: game clear, 5: CF video */
                blockState: 0,
                text: "",
                preloadStep: 0,
                cooldown: 0,
                videoTimer: 5,
                isVideoPaused: false,
                timerQueues: [],
                //遊戲類型
                gameSpecies: 0,
                puzzle: {
                    id: 0,
                    tips: [],
                    haystack: [],
                    needles: []
                },
                //答對題數
                isCorrect: [],
                uploadId: 0,
                history: [],
                config: {
                    clearance: 20,
                    round: 5,
                    helper: { express: [{ name: "EXPRESS_PASS", score: 1, cost: 0, quota: 1, cooldown: 0 }, { name: "EXPRESS_SHARE", score: 8, cost: 0, quota: 1, cooldown: 0 }, { name: "EXPRESS_VIDEO", score: 5, cost: 0, quota: 1, cooldown: 5 }], cues: [{ words: 1, score: 20, cost: 3, quota: 7, cooldown: 0 }, { words: 3, score: 20, cost: 5, quota: 7, cooldown: 0 }] }
                },
                puzzles: [
                    { "id": 13, "isCorrect": false, "tips": ["賀軍翔", "田馥甄", "李威", "趙詠華"], "haystack": "好三愛要灌鬥火籃美要來不球言敵牛過亮打植格", "needles": [{ "word": "鬥", "position": 5 }, { "word": "牛", "position": 15 }, { "word": "要", "position": 3 }, { "word": "不", "position": 11 }, { "word": "要", "position": 9 }] }
                ]
            },
            isMuted: true,
        };
    },
    created() {
        var round = 0;
        this.game.puzzle.needles = Array.from(
            {
                length: 1
            },
            function () {
                return {
                    position: -1,
                    word: "",
                    isDiff: false
                };
            });
    },
    computed: {
        cardImage() {
            if (this.user.reward == "7-11CITYCAFE45元任選購物金") {
                return "images/coffee1.png";
            }

            if (this.user.reward == "cama café中杯經典黑咖啡兌換券") {
                return "images/coffee2.png";
            }

            if (this.user.reward == "85度C45元單品即享券") {
                return "images/coffee3.png";
            }
        },
        tips: function () {
            var index = this.game.puzzle.tips.indexOf(".png");
            if(index == -1){
                return this.game.puzzle.tips;
            }else{
                return "images/"+this.game.puzzle.tips;
            }
        },
        haystack: function () {
            return this.game.puzzle.haystack;
        },
        needles: function () {
            return this.game.puzzle.needles;
        },
        spacePosition: function () {
            return this.game.puzzle.needles.findIndex(function (e) { 
                return e.position == -1; 
            });
        },
        isMatched: function () {
            return this.game.puzzle.needles.map(function (v) { return v.word }).join("") == this.game.puzzles[this.game.round].needles.map(function (v) { return v.word }).join("")
                ? true : false;
        },
        matchAnimation: function () {
            return {
                animate__flash: this.spacePosition == -1 && this.isMatched,
                animate__shakeX: this.spacePosition == -1 && !this.isMatched
            }
        },
        activePrizes: function () {
            return this.prize.pass.filter(function (v) { return v.isActive == true; });
        },
        activeWeeklyPrizes: function () {
            var weeklyGift = this.prize.weekly.find(function (v) { return v.isActive == true; });
            var gifts = this.prize.daily.filter(function (v) { return v.weekly == this }, weeklyGift.weekly);
            gifts.splice(gifts.length, 0, weeklyGift);
            return gifts;
        },
        timerCtrl: function () {
            return {
                timer: this.game.cooldown > 0
            };
        },
    },
    methods: {
        play(game) {
            this.game.playState = 2;
            this.game.gameSpecies = game;
            if(game == 1){
                this.getPuzzles()
                    .then(function (vm) {
                        vm.initGame(game);
                    });
            }
            
            if(game == 2){
                this.getSongs()
                    .then(function (vm) {
                        vm.initGame(game);
                    });
            }

            if(game == 3){
                this.getDramas()
                    .then(function (vm) {
                        vm.initGame(game);
                    });
            }
        },
        replay() {
            this.game.gameSpecies = 0;
        },
        closepop() {
            this.game.playState = 0;
        },
        event_member() {
            this.game.eventMember = 1;
        },
        closeevent_member() {
            this.game.eventMember = 0;
        },
        coffeeShow() {
            this.coffee.inputshow = 0;
        },
        coffeeInputShow() {
            this.nowtime();
        },
        initGame(gameID) {
            this.game.round = 0;
            this.game.score = 0;
            this.game.uploadId = 0;
            this.game.history.splice(0);
            this.game.history.push("GAME_START");
            this.game.playState = 2;
            this.game.correct = 0;
            this.game.isCorrect = [];
            this.game.timerQueues = [];
            this.game.puzzle.needles = Array.from(
                {
                    length: 1
                },
                function () {
                    return {
                        position: -1,
                        word: "",
                        isDiff: false
                    };
                });
            this.game.puzzle.haystack = [];
            this.initPuzzle(gameID);
        },
        initPuzzle(gameID) {
            var round = this.game.round;

            if(gameID == 1){
                this.game.puzzle.tips = this.game.puzzles[round].tips;
                this.game.puzzle.haystack = this.game.puzzles[round].haystack.split("");
                this.game.puzzle.needles = Array.from(
                    {
                        length: this.game.puzzles[round].needles.length
                    },
                    function () {
                        return {
                            position: -1,
                            word: "",
                            isDiff: false
                        };
                    });
            }

            if(gameID == 2  || gameID == 3){
            this.game.puzzle.tips = this.game.puzzles[round].tips;
            this.game.puzzle.haystack[0] = this.game.puzzles[round].haystack[0];
            this.game.puzzle.haystack[1] = this.game.puzzles[round].haystack[1];
            this.game.puzzle.haystack[2] = this.game.puzzles[round].haystack[2];
            this.game.puzzle.id = this.game.puzzles[round].id;
            this.game.puzzle.needles = Array.from(
                {
                    length: this.game.puzzles[round].needles.length
                },
                function () {
                    return {
                        position: -1,
                        word: "",
                        isDiff: false
                    };
                });
            }
            
            this.game.history.push("ROUND_START_" + round);
        },
        pick(index, target) {
            if(this.game.gameSpecies == 1){
                var word = this.game.puzzle.haystack[index];
            }

            if(this.game.gameSpecies == 2 || this.game.gameSpecies == 3){
                switch (index) {
                    case 0:
                        word = this.haystack[0];
                        break;
    
                    case 1:
                        word = this.haystack[1];
                        break;
    
                    case 2:
                        word = this.haystack[2];
                        break;
                }
            }
            
            if (word == "") {
                return false;
            }

            var position;
            position = this.spacePosition;
            if (target !== undefined) {
                position = target;
            }
            
            if (position == -1) {
                return false;
            }

            if(this.game.gameSpecies == 1){
                if (this.game.puzzle.needles[position].position != index) {
                    this.removeNeedle(position);
                }
            }

            var needle = {
                position: index,
                word: word,
                isDiff: target !== undefined ? true : false
            };

            this.game.puzzle.needles.splice(position, 1, needle);
            
            if(this.game.gameSpecies == 1){
                this.game.puzzle.haystack[index] = "";
            }
            return true;
        },
        nextRound(gameID) {
            if (this.spacePosition != -1) {
                return true;
            }

            if (this.isMatched) {
                vm.game.correct++;
                if(this.game.round +1 != this.game.isCorrect.length){
                    vm.game.isCorrect.push("Ｏ");
                }
            }else{
                if(this.game.round +1 != this.game.isCorrect.length){
                    vm.game.isCorrect.push("Ｘ");
                }
            }

            if (this.game.history.indexOf("ROUND_CLEAR_" + this.game.round) != -1) {
                return false;
            }

            this.game.history.push("ROUND_CLEAR_" + this.game.round);
            this.$nextTick()
                .then(function (vm) {
                    if (vm.game.round == vm.game.config.round - 1) {
                        vm.game.playState = 4;
                        vm.game.gameSpecies = 0;
                        vm.game.history.push("GAME_CLEAR");
                        vm.game.blockState = 4;
                        
                        switch (vm.game.correct) {
                            case 0:
                                vm.game.text = "掰咖";
                                break;

                            case 1:
                                vm.game.text = "掰咖";
                                break;

                            case 2:
                                vm.game.text = "掰咖";
                                break;

                            case 3:
                                vm.game.text = "Ｂ咖";
                                break;

                            case 4:
                                vm.game.text = "A咖";
                                break;

                            case 5:
                                vm.game.text = "K+之王";
                                break;
                        }

                        return true;
                    }

                    vm.game.round++;
                    vm.initPuzzle(gameID);
                });
        },
        removeNeedle(index) {
            var lengtn = this.game.puzzle['needles'].length -1 ;
            if(this.game.puzzle['needles'][lengtn]['position'] != -1){
                return false;
            }

            var needle = this.game.puzzle.needles[index];
            if (needle.position == -1) {
                return false;
            }

            this.game.puzzle.haystack.splice(needle.position, 1, needle.word);

            needle.position = -1;
            needle.word = "";
            this.game.puzzle.needles.splice(index, 1, needle);
        },
        express(name) {
            
            if (this.game.playState != 2) {
                return false;
            }

            if (!this.hasExpressQuota(name)) {
                return false;
            }

            if(name == 'EXPRESS_SHARE'){
                this.game.blockState = 2;
                facebookMe.target.refer = "2021summerking";
                facebookMe.target.href = "https://acts.setn.com/event/2021summerking/";
                facebookMe.target.hashtag = "#K劇K歌K人誰要來K一夏？";
                facebookMe.share(this.shareclearRound, name);
            }else{
                this.clearRound(name);
                vm.game.correct --;
                vm.game.isCorrect.push("Ｘ");
            }

            return true;
        },
        cue(size) {
            if (this.game.playState != 2) {
                return false;
            }

            var cue = this.getCueBySize(size);
            if (this.game.score < cue.cost) {
                $('.info').trigger('click');
                return false;
            }

            this.game.score -= cue.cost;
            this.game.history.push("CUE_" + size);

            var needles = this.game.puzzles[this.game.round].needles;
            let selected = needles.map(function (v, i) { return i; })
                .sort(function (a, b) { return 0.5 - Math.random(); })
                .slice(0, size)
                .sort();

            var index, target;
            for (var i in selected) {
                target = selected[i];

                index = this.game.puzzle.needles
                    .map(function (v) { return v.position })
                    .indexOf(needles[target].position);
                if (index != -1) {
                    this.removeNeedle(index);
                }

                this.pick(needles[target].position, target);
            }
        },
        delay(callback, seconds) {
            if (!seconds) {
                seconds = 1;
            }

            this.game.timerQueues.push(callback);
            this.game.cooldown = 1;
        },
        timeUp() {
            this.game.timerQueues.shift()(vm.game.gameSpecies);
            this.game.cooldown = 0;
        },
        clearRound(name) {
            if (!name) {
                return false;
            }

            this.game.history.push(name);
            this.game.blockState = 0;

            for (var i in this.game.puzzle.needles) {
                this.removeNeedle(i);
            }

            if(this.game.gameSpecies == 1){
                var needles = this.game.puzzles[this.game.round].needles.map(function (v) { return v.word }).join("");
                var index = -1;
                for (var i in needles) {
                    index = this.haystack.indexOf(needles[i]);
                    this.pick(index);
                }
            }

            if(this.game.gameSpecies == 2 || this.game.gameSpecies == 3){
                var needles = this.game.puzzles[this.game.round].needles.map(function (v) { return v.word }).join("").slice(0,1);
                switch (needles) {
                    case "A":
                        index = 0;
                        break;

                    case "B":
                        index = 1;
                        break;

                    case "C":
                        index = 2;
                        break;
                }
                this.pick(index);
            }
            
        },
        shareclearRound(name) {
            vm.game.correct --;
            vm.game.isCorrect.push("Ｘ");
            if (!name) {
                return false;
            }

            this.game.history.push(name);
            this.game.blockState = 0;

            for (var i in this.game.puzzle.needles) {
                this.removeNeedle(i);
            }

            if(this.game.gameSpecies == 1){
                var needles = this.game.puzzles[this.game.round].needles.map(function (v) { return v.word }).join("");
                var index = -1;
                for (var i in needles) {
                    index = this.haystack.indexOf(needles[i]);
                    this.pick(index);
                }
            }

            if(this.game.gameSpecies == 2 || this.game.gameSpecies == 3){
                var needles = this.game.puzzles[this.game.round].needles.map(function (v) { return v.word }).join("").slice(0,1);
                switch (needles) {
                    case "A":
                        index = 0;
                        break;

                    case "B":
                        index = 1;
                        break;

                    case "C":
                        index = 2;
                        break;
                }
                this.pick(index);
            }
            
        },
        getExpressByName(name) {
            return this.game.config.helper.express.find(function (v) {
                return v.name == this.name;
            }, { name: name });
        },
        hasExpressQuota(name) {
            var express = this.getExpressByName(name);
            return express.quota > this.game.history.filter(function (v) { return v == this }, name).length;

        },
        getRandomInt: function (min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        },
        nowtime() {
            $.post(vm.apiBaseUrl + "/user/severTime", {
        
            })
            .done(function (result) {
                var nowtime = result.split(" ")[1].replace('"'," ");
                if(nowtime >= vm.coffee.start_time && vm.coffee.end_time > nowtime){
                    vm.coffee.inputshow = 1;
                    return false;
                }

                vm.coffee.inputshow = 5;
            })
        },
        async getPuzzles() {
            return await axios({
                method: "get",
                url: "assets/puzzles.json",
                data: {}
            }).then(function (response) {
                var puzzles = response.data;
                vm.game.puzzles.splice(0);
                puzzles
                    .sort(function (a, b) { return 0.5 - Math.random(); })
                    .slice(0, 5)
                    .forEach(function (v) {
                        vm.game.puzzles.push(v);
                    });                    
                return vm;
            }).catch(function (error) {
                console.error(error);
            });
        },
        async getSongs() {
            return await axios({
                method: "get",
                url: "assets/song.json",
                data: {}
            }).then(function (response) {
                var puzzles = response.data;
                vm.game.puzzles.splice(0);
                puzzles
                    .sort(function (a, b) { return 0.5 - Math.random(); })
                    .slice(0, 5)
                    .forEach(function (v) {
                        vm.game.puzzles.push(v);
                    });                    
                return vm;
            }).catch(function (error) {
                console.error(error);
            });
        },
        async getDramas() {
            return await axios({
                method: "get",
                url: "assets/drama.json",
                data: {}
            }).then(function (response) {
                var puzzles = response.data;
                vm.game.puzzles.splice(0);
                puzzles
                    .sort(function (a, b) { return 0.5 - Math.random(); })
                    .slice(0, 5)
                    .forEach(function (v) {
                        vm.game.puzzles.push(v);
                    });                    
                return vm;
            }).catch(function (error) {
                console.error(error);
            });
        },
        shareMyScore() {
            facebookMe.target.refer = "2021summerking";
            facebookMe.target.href = "https://acts.setn.com/event/2021summerking/";
            facebookMe.target.hashtag = "#K劇K歌K人誰要來K一夏？";
            facebookMe.share();
        },
        /**
         *  遊戲開始
         */
        start(gameid) {
            if (!register(this.user.id)) {
                this.user.id == "";
                this.user.idError = true;
                alert('查無此會員');
                return false;
            } else {
                switch (gameid) {
                    //玩遊戲結果
                    case 1:
                        this.select_ward();
                        vm.game.playState = 5;
                        break;
                    //咖啡抽獎
                    case 2:
                        this.isEmail()
                            .then(function (result) {
                                if(vm.user.email){
                                    vm.lottery();
                                }else{
                                    vm.coffee.inputshow = 4;
                                }
                            })
                        break;
                }
            }
        },
        async isEmail() {
            return await $.get(vm.apiBaseUrl + "/user/memberData", {
                'memId': (vm.user.id-3)/3,
            }, function (result) {
                vm.user.email = JSON.parse(result)['GetObject']['email'];
            });
        },
        select_ward() {
            $.post(vm.apiBaseUrl + "/lottery/select_ward", {
                'member': vm.user.id,
                'event': vm.name,
                'reward': vm.game.correct
            });
        },
        lottery() {
            $.post(vm.apiBaseUrl + "/lottery", {
                'event': vm.name,
                'member': vm.user.id,
            })
            .done(function (result) {
                if(JSON.parse(result) == false){
                    vm.coffee.inputshow = 3;
                    return false;
                }
                vm.coffee.inputshow = 2;
                vm.user.reward = JSON.parse(result);
            })
            .fail(function (error) {
                vm.coffee.inputshow = 3;
            });
        }
    }
});

/**
 * 會員登入
 */
const register = function (id) {
    var member = parseInt(id);
    member = isNaN(member) ? 0 : member;
    member = (member - 3) / 3;
    var result = false;
    $.ajax({
        method: "GET",
        url: "https://event.setn.com/ci/User/memberId?number=" + member,
        async: false,
        success: function (response) {
            result = response;
        },
        error: function (jqXHR, textStatus, errorThrown) {
        }
    });

    return result == 'true';
}

// function register() {
//     if (!vm.user.token.length) {
//         openFacebookRegister();
//         return false;
//     }

//     return true;
// }

// function openFacebookRegister() {
//     window.open('https://memberapi.setn.com/Customer/FacebookLoginForEvent?e=' + vm.name, '', config = 'height=800,width=600');
//     return true;
// }

// function callbackFacebookLogin(data) {
//     if (data.result !== true) {
//         return false;
//     }

//     vm.user.token = data.GetObject.token;
//     $.ajax({
//         method: "GET",
//         url: "https://event.setn.com/api/user",
//         data: { token: vm.user.token },
//         dataType: "json",
//         context: this,
//         success: function (response) {
//             vm.user.id = response.fb_id;
//             vm.user.name = response.name;
//             vm.user.email = response.email;
//             vm.game.playState = 0;
//             vm.play();
//         },
//         error: function (jqXHR, textStatus, errorThrown) {
//         }
//     });
// }

$(document).ready(function () {
    // if (document.location.protocol == "http:") {
    //     window.location.replace(window.location.href.replace("http:", "https:"));
    // }

    // window.addEventListener('message', function (event) {
    //     if ((event.origin.indexOf('setn.com') != -1) || (event.origin.indexOf('sanlih.com.tw') != -1)) {
    //         callbackFacebookLogin(event.data);
    //     }
    // });

    $("#gotop").click(function () {
        $("html,body").animate({
            scrollTop: 0
        }, 1000);
    });
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('#gotop').fadeIn("fast");
        } else {
            $('#gotop').stop().fadeOut("fast");
        }
    });
});


    $(function () {
        var extraOffset = 90;
        $('a[href=#prizeArea]').click(function () {
            $('html,body').animate({
                scrollTop: $('#prizeArea').offset().top - extraOffset
            }, "show");
            return false;
        });
        $('a[href=#gameArea]').click(function () {
            $('html,body').animate({
                scrollTop: $('#gameArea').offset().top - extraOffset
            }, "show");
            return false;
        });        
    });

    $(function () {
      $('.infoCarousel').owlCarousel({
            loop: true,
            margin: 0,
            nav: true,
            dots: true,
            autoplay: false,
            navClass: ["carouselNav_prevApp", "carouselNav_nextApp"],
            navText: [" ", " "],
            navContainerClass: "carouselNavApp",
            items: 1
      });
    });