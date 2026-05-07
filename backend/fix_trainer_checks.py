import re
import os

def fix_trainer_checks(file_path):
    """Виправляє перевірки current_user.trainer в API файлах"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Паттерн 1: if current_user.role == "trainer" and current_user.trainer:
    #            query = query...filter(Student.trainer_id == current_user.trainer.id)
    pattern1 = r'if current_user\.role == "trainer" and current_user\.trainer:\s+query = query([^\n]+)filter\(([^.]+)\.trainer_id == current_user\.trainer\.id\)'

    def replace1(match):
        query_part = match.group(1)
        model = match.group(2)
        return f'''trainer = db.query(User).filter(User.id == current_user.id).first()
    if trainer and trainer.trainer:
        query = query{query_part}filter({model}.trainer_id == trainer.trainer.id)'''

    content = re.sub(pattern1, replace1, content)

    # Паттерн 2: if current_user.role == "trainer" and current_user.trainer:
    #            if student.trainer_id != current_user.trainer.id:
    pattern2 = r'if current_user\.role == "trainer" and current_user\.trainer:\s+if (\w+)\.trainer_id != current_user\.trainer\.id:'

    def replace2(match):
        var_name = match.group(1)
        return f'''trainer = db.query(User).filter(User.id == current_user.id).first()
    if trainer and trainer.trainer:
        if {var_name}.trainer_id != trainer.trainer.id:'''

    content = re.sub(pattern2, replace2, content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {file_path}")
        return True
    else:
        print(f"No changes: {file_path}")
        return False

# Виправляємо файли
api_dir = "app/api"
files_to_fix = ["attendance.py", "payments.py", "groups.py"]

for filename in files_to_fix:
    file_path = os.path.join(api_dir, filename)
    if os.path.exists(file_path):
        fix_trainer_checks(file_path)
    else:
        print(f"File not found: {file_path}")
