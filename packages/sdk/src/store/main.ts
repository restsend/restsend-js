import { IClientStore } from ".";
import { IAllApi } from "../api";
import { ClientStore } from "./store";


export const createStore = (apis: IAllApi): IClientStore => {
  return new ClientStore(apis);
}