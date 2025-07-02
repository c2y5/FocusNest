PORT="$1"

kill -9 $(lsof -ti:$PORT) 2>/dev/null
git pull
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

mkdir -p logs

gunicorn -b ":$PORT" "app:create_app()" \
    --timeout 120 \
    --access-logfile - \
    --access-logformat '%(h)s - - [%(t)s] "%(r)s" %(s)s -' \
    --error-logfile logs/app.log \
    --log-level info \
    --capture-output \
    | tee -a logs/app.log