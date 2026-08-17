import json
from database import load_user
from database import dump_user

def userprofile():
    f = load_user()
    for key, values in f.items():
        print(key, " = ", values)

def userhabit():
    f = load_user()
    for habit in f["Habits"]:
        print("Name =", habit["Name"],
              "\nFrequency=", habit["Frequency"],
              "\nStatus=", habit["Status"])

def userprogress():
    f = load_user()
    for i in f["progress"]:
        print(i)

def usertimetable():
    f = load_user()
    for task in f["Timetable"]:
        print("Time = ", task["Time"],
              "\nTask=", task["Todo"],
              "\nStatus= ", task["Status"])

def addtask():
    f = load_user()
    time = input("Enter time: ")
    task = input("Enter Task: ").lower()
    status = "pending"
    new_task = {
        "Time": time,
        "Todo": task,
        "Status": status
    }
    f["Timetable"].append(new_task)
    dump_user(f)
    print("\nTask added successfully\n")

def addhabit():
    name = input("Enter the habit: ").lower()
    freq = input("Enter the frequency of that habit: ")
    status = "pending"
    a = {
        "Name": name,
        "Frequency": freq,
        "Status": status
    }
    f = load_user()
    f["Habits"].append(a)
    dump_user(f)
    print("Habit added successfully")

def markdone():
    f = load_user()
    icp = int(input("What do you want to mark\n1.Timetable(task)\n2.Habits\n"))
    if icp == 1:
        flag = 0
        ip = input("Enter the task you have done: ").lower()
        for task in f["Timetable"]:
            if task["Todo"].lower() == ip:
                flag = 1
                task["Status"] = "Done"
                dump_user(f)
                break
        if flag == 0:
            print("There's no such entry")
    elif icp == 2:
        flag = 0
        ip = input("Enter the habit you want to mark: ").lower()
        for habit in f["Habits"]:
            if habit["Name"].lower() == ip:
                habit["Status"] = "Done"
                flag = 1
                dump_user(f)
                break
        if flag == 0:
            print("No such entries exist")

def Delete():
    xip = int(input("Enter what you want to remove:\n1.Timetable\n2.Habit\n"))
    if xip == 1:
        f = load_user()
        ip = input("\nEnter the Task you want to delete: ").lower()
        i = False
        for dtask in f["Timetable"]:
            if ip == dtask["Todo"].lower():
                f["Timetable"].remove(dtask)
                i = True
                break
        if not i:
            print("There is no such entry")
        else:
            dump_user(f)
    elif xip == 2:
        i = False
        f = load_user()
        ip = input("Enter the Habit you want to remove: ").lower()
        for habit in f["Habits"]:
            if ip == habit["Name"].lower():
                f["Habits"].remove(habit)
                i = True
                break
        if not i:
            print("No such entry exists")
        else:
            dump_user(f)

def update():
    f = load_user()
    i = False
    xip = int(input("Enter the updation you want to do in:\n1.Habits\n2.Timetable\n"))
    if xip == 1:
        yip = int(input("Enter what do you want to update in habits:\n1.Name\n2.Frequency\n3.Status\n"))
        if yip == 1:
            zip = input("Enter the Habit you want to change: ").lower()
            for task in f["Habits"]:
                if zip == task["Name"].lower():
                    cip = input("Enter the changing name: ").lower()
                    task["Name"] = cip
                    print("Successfully updated name")
                    i = True
                    break
        if yip == 2:
            zip = input("Enter the habit name for which you want to change the frequency: ").lower()
            for task in f["Habits"]:
                if zip == task["Name"].lower():
                    cip = input("Enter The Frequency: ")
                    task["Frequency"] = cip
                    print("Successfully updated frequency")
                    i = True
                    break
        if yip == 3:
            zip = input("Enter the habit name for which you want to change the status: ").lower()
            for task in f["Habits"]:
                if zip == task["Name"].lower():
                    cip = input("Enter The Status: ")
                    task["Status"] = cip
                    print("Successfully updated status")
                    i = True
                    break
    if xip == 2:
        yip = int(input("Enter what do you want to update in Timetable:\n1.Task\n2.Time\n3.Status\n"))
        if yip == 1:
            zip = input("Enter the Task you want to change: ").lower()
            for task in f["Timetable"]:
                if zip == task["Todo"].lower():
                    cip = input("Enter The changing Task: ").lower()
                    task["Todo"] = cip
                    print("Successfully updated task")
                    i = True
                    break
        if yip == 2:
            zip = input("Enter the task for which you want to change the time: ").lower()
            for task in f["Timetable"]:
                if zip == task["Todo"].lower():
                    cip = input("Enter The Time: ")
                    task["Time"] = cip
                    print("Successfully updated time")
                    i = True
                    break
        if yip == 3:
            zip = input("Enter the task for which you want to change the status: ").lower()
            for task in f["Timetable"]:
                if zip == task["Todo"].lower():
                    cip = input("Enter The Status: ")
                    task["Status"] = cip
                    print("Successfully updated status")
                    i = True
                    break
    if not i:
        print("------PLEASE ENTER THE VALID INFO------")
    else:
        dump_user(f)