export class Clip {
  start: string = "";
  end: string = "";
  tags: string[] = [];
}

export class MdData {
  title: string = "";
  link: string = "";
  date: string = "";
  who: string[] = [];
  clips: Clip[] = [];
}
