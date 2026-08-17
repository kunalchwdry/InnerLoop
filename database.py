import json
def load_user():
    with open("user.json","r") as f:
        return json.load(f)
        
def dump_user(user):
    with open("user.json","w") as f:
        json.dump(user,f,indent=4)
        