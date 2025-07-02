PORT="$1"

kill -9 $(lsof -ti:$PORT) 2>/dev/null
git pull
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

mkdir -p logs

gunicorn -b ":$PORT" "app:create_app()" \
    --timeout 120 \
    --access-logfile logs/app.log \
    --access-logformat '%(h)s - - [%(t)s] "%(r)s" %(s)s -' \
    --capture-output \
    --error-logfile logs/error.log \
    --log-level info