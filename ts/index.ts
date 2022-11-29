import express from 'express';
import { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import path from 'path';

class Article{
    public name: string;

    public title: string;
    public contents: string;

    public constructor(name: string, title: string, contents: string){
        this.name = name;
        this.title = title;
        this.contents = contents;
    }
}

const bbs: Article[] = [
    { name: 'tj', title: 'hello', contents: 'nice to meet you' },
    { name: 'bj', title: 'I\'m new here', contents: 'yoroshiku' },
    { name: 'tj', title: 'here again!', contents: 'anybody here?' },
    { name: 'ts', title: 'rich people', contents: 'money ain\'t an issue' },
];

function listBbs(req: Request, res: Response, next: NextFunction): void{
    try{
        res.render('bbs', {list:bbs});
    }   catch (error){
        next(error);        
    }
};

function writeBbs(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.session.user){
            res.redirect("login"); 
        } else {
            bbs.push({name: req.session.user.name, title: req.body.title, contents: req.body.contents});
            res.redirect("/bbs");  
        }
    }
    catch (error){
        next(error);
    }
}

class User {
    public name: string;

    public password: string;

    public constructor(name: string, password: string) {
        this.name = name;
        this.password = password;
    }
}

declare module 'express-session' {
    interface SessionData {
        user: User;
        error: string;
        success: string;
    }
}

const users: User[] = [
    { name: 'tj', password: 'foobar' },
    { name: 'bj', password: 'pass' },
    { name: 'kj', password: 'word' },
    { name: 'ts', password: 'ts' },
    { name: 'tl', password: 'tl' },
];

function findUser(name: string): User | null {
    var user = users.find(user => user.name === name);
    if (!user) return null;
    else return user;
}

function authenticate(name: string, pass: string, fn: (user: User | null) => void) {
    var user = findUser(name);
    if (!user) return fn(null);
    if (pass === user.password) return fn(user);
    fn(null);
}

function index(req: Request, res: Response, next: NextFunction): void {
    try {
        res.redirect('/login');
    } catch (error) {
        next(error);
    }
};

function register(req: Request, res: Response, next: NextFunction): void { //get request을 통해서 회원가입 페이지 불러오기?
    try {
        res.render('register'); //register.ejs로 이동?
    } catch (error) {
        next(error);
    }
};

function registerUser(req: Request, res: Response, next: NextFunction) { //this is for making a new account where new username and password are pushed into the users array
    try {
        if (!req.session.user){ //로그인이 안되어있으면 
            users.push({name: req.body.nusername, password: req.body.npassword}); //users array에 새 아이디/비번 추가!
            res.redirect('/login');
        } else { //로그인이 되어있으면 ..왜 회원가입을?
            res.redirect('/login');
        }
    } catch (error) {
        next(error);
    }
}

function signUp(req: Request, res: Response, next: NextFunction): void { 
    try {
        res.render('login', { loggedin: req.session.user });
    } catch (error) {
        next(error);
    }
};

function logIn(req: Request, res: Response, next: NextFunction): void {
    try {
        authenticate(req.body.username, req.body.password, function (user) {
            if (user) {
                req.session.regenerate(function () {
                    req.session.user = user;
                    req.session.success = 'username: ' + user.name;
                    res.redirect('back');
                });
            } else {
                req.session.error = '비밀번호가 틀렸습니다. '
                    + ' (use "tj" and "foobar")';
                res.redirect('/');
            }
        });
    } catch (error) {
        next(error);
    }
};

function logOut(req: Request, res: Response, next: NextFunction): void {
    try {
        req.session.destroy(function () {
            res.redirect('/');
        });
    } catch (error) {
        next(error);
    }
};

//following is a function for the user's webpage which only shows the posts that are written by the current session user
function myPosts(req: Request, res: Response, next: NextFunction): void {
    try {
        if (!req.session.user){
            res.redirect("login");
        } else {
            var myPosts = bbs.filter(function (post) {
                //request current session's user name in a different method
                return post.name === req.session.user?.name;
            });
            res.render('myposts', {
                list: myPosts,
                loggedin: req.session.user
            }); 
        }
    } catch (error) {
        next(error);
    }
};

function restricted(req: Request, res: Response, next: NextFunction): void {
    try {
        if (req.session.user) {
            res.render("restricted");
        } else {
            req.session.error = '접근 금지!';
            res.redirect('/');
        }

    } catch (error) {
        next(error);
    }
};

class App {
    public app: express.Application;
    constructor() {
        this.app = express();
        this.initializeMiddlewares();
        this.initializeRoutes();
    }

    public listen(port: number) {
        this.app.listen(port);
    }
    private initializeMiddlewares() {
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(session({
            resave: false,
            saveUninitialized: false,
            secret: 'asdf!@#$qwer'
        }));
        this.app.use(function (req: Request, res: Response, next) {
            var err = req.session.error;
            var msg = req.session.success;
            delete req.session.error;
            delete req.session.success;
            res.locals.message = '';
            if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
            if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
            next();
        });
    }

    private initializeRoutes() {
        this.app.get('/', index);
        this.app.get('/login', signUp);
        this.app.post('/login', logIn);
        this.app.get('/restricted', restricted);
        this.app.get('/logout', logOut);
        this.app.get('/bbs', listBbs);
        this.app.post('/write', writeBbs); //이 줄에서 'post'를 'get'으로 잘못 씀.. 이 오류 원인 찾는데 3시간 걸림 :(
        this.app.get('/register', register);
        this.app.post('/register', registerUser);
        this.app.get('/myPosts', myPosts);
    }
}

const app = new App();

app.listen(8080)