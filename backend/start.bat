@echo off
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Running migrations...
python migrate_db.py
python migrate_attendance_columns.py

echo.
echo Initializing database...
python init_db.py

echo.
echo Starting server...
uvicorn main:app --reload --host 0.0.0.0 --port 8000
