private initializeRoutes() {
    this.app.get('/', index);
    this.app.get('/login', signUp);

}